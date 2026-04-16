import { OrderStatus } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'
import { getIO } from '../socket'
import { HttpError } from '../middleware/errorHandler'
import { triggerEventScenarios } from '../cron/scenarios'
import { sendExpoPush } from '../lib/push'

interface OrderItem {
  name: string
  qty: number
  price: number
}

interface CreateOrderDto {
  customerPhone: string
  customerName?: string
  address: string
  items?: OrderItem[]
  notes?: string
  courierId?: string
  totalAmount?: number
}

export async function getOrders(
  businessId: string,
  filters: { status?: string; courierId?: string; date?: string; search?: string }
) {
  const where: Record<string, unknown> = { businessId }

  if (filters.status) {
    where.status = filters.status as OrderStatus
  }
  if (filters.courierId) {
    where.courierId = filters.courierId
  }
  if (filters.date) {
    const start = new Date(filters.date)
    const end = new Date(filters.date)
    end.setDate(end.getDate() + 1)
    where.createdAt = { gte: start, lt: end }
  }
  if (filters.search) {
    where.OR = [
      { customer: { phone: { contains: filters.search } } },
      { id: { contains: filters.search } },
    ]
  }

  return prisma.order.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      courier: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}

export async function createOrder(businessId: string, dto: CreateOrderDto) {
  return prisma.$transaction(async (tx) => {
    // Найти или создать клиента
    let customer = await tx.customer.findUnique({
      where: { businessId_phone: { businessId, phone: dto.customerPhone } },
    })

    if (!customer) {
      customer = await tx.customer.create({
        data: {
          businessId,
          phone: dto.customerPhone,
          name: dto.customerName,
        },
      })
    } else if (dto.customerName && !customer.name) {
      customer = await tx.customer.update({
        where: { id: customer.id },
        data: { name: dto.customerName },
      })
    }

    // Создать заказ
    const order = await tx.order.create({
      data: {
        businessId,
        customerId: customer.id,
        courierId: dto.courierId || null,
        deliveryAddress: dto.address,
        items: (dto.items ?? []) as object[],
        totalAmount: dto.totalAmount,
        notes: dto.notes,
        status: dto.courierId ? 'ASSIGNED' : 'NEW',
        assignedAt: dto.courierId ? new Date() : null,
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        courier: { select: { id: true, name: true } },
      },
    })

    // Создать или обновить CRM профиль
    await tx.crmProfile.upsert({
      where: { customerId: customer.id },
      create: {
        customerId: customer.id,
        ordersCount: 1,
        firstOrderAt: new Date(),
        lastOrderAt: new Date(),
      },
      update: {
        ordersCount: { increment: 1 },
        lastOrderAt: new Date(),
      },
    })

    // Записать историю статуса
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: order.status,
        comment: 'Заказ создан',
      },
    })

    return order
  })
}

export async function getOrder(id: string, businessId: string) {
  const order = await prisma.order.findFirst({
    where: { id, businessId },
    include: {
      customer: true,
      courier: { select: { id: true, name: true, phone: true, photoUrl: true } },
      statusHistory: { orderBy: { changedAt: 'asc' } },
    },
  })

  if (!order) {
    throw new HttpError(404, 'Заказ не найден')
  }

  return order
}

export async function assignCourier(id: string, businessId: string, courierId: string) {
  const order = await prisma.order.findFirst({ where: { id, businessId } })
  if (!order) {
    throw new HttpError(404, 'Заказ не найден')
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { courierId, status: 'ASSIGNED', assignedAt: new Date() },
    include: { customer: { select: { name: true, phone: true } } },
  })

  await prisma.orderStatusHistory.create({
    data: { orderId: id, status: 'ASSIGNED' },
  })

  getIO().to(`business:${businessId}`).emit('order:status', { orderId: id, status: 'ASSIGNED' })

  const courier = await prisma.courier.findUnique({ where: { id: courierId } })
  if (courier?.pushToken) {
    const customerName = updated.customer?.name ?? updated.customer?.phone ?? 'Клиент'
    sendExpoPush(
      courier.pushToken,
      'Новый заказ',
      `${customerName} — ${updated.deliveryAddress}`,
      { orderId: id }
    )
  }

  return updated
}

export async function updateOrderStatus(
  id: string,
  businessId: string,
  status: OrderStatus,
  comment?: string
) {
  const order = await prisma.order.findFirst({ where: { id, businessId } })
  if (!order) {
    throw new HttpError(404, 'Заказ не найден')
  }

  const updateData: Record<string, unknown> = { status }

  if (status === 'PICKED_UP') updateData.pickedUpAt = new Date()
  if (status === 'DELIVERED') updateData.deliveredAt = new Date()

  const updated = await prisma.order.update({ where: { id }, data: updateData })

  await prisma.orderStatusHistory.create({ data: { orderId: id, status, comment } })

  // Обновить CRM профиль при доставке
  if (status === 'DELIVERED' && order.totalAmount) {
    await prisma.crmProfile.update({
      where: { customerId: order.customerId },
      data: {
        totalSpent: { increment: order.totalAmount },
        lastOrderAt: new Date(),
      },
    })
  }

  const io = getIO()
  io.to(`business:${businessId}`).emit('order:status', { orderId: id, status })
  io.to(`order:${id}`).emit('order:status', { orderId: id, status })

  // Запустить event-сценарии асинхронно (не блокируем ответ)
  const customer = await prisma.customer.findUnique({ where: { id: order.customerId } })
  const ctx = {
    customerId: order.customerId,
    orderId: id,
    customerName: customer?.name ?? undefined,
    customerPhone: customer?.phone,
    businessId,
  }

  if (status === 'FAILED') {
    triggerEventScenarios('order_failed', ctx).catch(() => null)
  }

  if (status === 'DELIVERED') {
    const profile = await prisma.crmProfile.findUnique({ where: { customerId: order.customerId } })
    const ordersCount = profile?.ordersCount ?? 1
    if (ordersCount === 1) {
      triggerEventScenarios('first_order', ctx).catch(() => null)
    }
    triggerEventScenarios('nth_order', { ...ctx, nthOrderCount: ordersCount }).catch(() => null)
  }

  return updated
}

export async function cancelOrder(id: string, businessId: string) {
  const order = await prisma.order.findFirst({ where: { id, businessId } })
  if (!order) {
    throw new HttpError(404, 'Заказ не найден')
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status: 'CANCELLED' },
  })

  await prisma.orderStatusHistory.create({
    data: { orderId: id, status: 'CANCELLED' },
  })

  return updated
}

export async function getTrackingData(token: string) {
  // Сначала ищем в Redis (быстро)
  const cached = await redis.hgetall(`tracking:${token}`)

  let orderId: string

  if (cached?.orderId) {
    orderId = cached.orderId
  } else {
    const order = await prisma.order.findUnique({ where: { trackingToken: token } })
    if (!order) {
      throw new HttpError(404, 'Ссылка недействительна')
    }
    orderId = order.id

    // Сохранить в Redis на 48 часов
    await redis.hset(`tracking:${token}`, {
      orderId: order.id,
      courierId: order.courierId ?? '',
      status: order.status,
      businessId: order.businessId,
    })
    await redis.expire(`tracking:${token}`, 48 * 3600)
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      courier: { select: { id: true, name: true, photoUrl: true } },
      business: { select: { name: true, logoUrl: true, brandColor: true } },
    },
  })

  if (!order) {
    throw new HttpError(404, 'Заказ не найден')
  }

  let courierLat: number | null = null
  let courierLng: number | null = null

  if (order.courierId) {
    const loc = await redis.hgetall(`courier:location:${order.courierId}`)
    if (loc?.lat) {
      courierLat = parseFloat(loc.lat)
      courierLng = parseFloat(loc.lng)
    }
  }

  return {
    orderId: order.id,
    status: order.status,
    deliveryAddress: order.deliveryAddress,
    courier: order.courier
      ? {
          name: order.courier.name,
          photoUrl: order.courier.photoUrl,
          lat: courierLat,
          lng: courierLng,
        }
      : null,
    business: {
      name: order.business.name,
      logoUrl: order.business.logoUrl,
      brandColor: order.business.brandColor,
    },
  }
}
