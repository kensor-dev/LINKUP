import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'
import { HttpError } from '../middleware/errorHandler'

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && (digits.startsWith('8') || digits.startsWith('7'))) {
    return '+7' + digits.slice(1)
  }
  if (digits.length === 10) {
    return '+7' + digits
  }
  return phone.startsWith('+') ? phone : '+' + digits
}

export async function getCouriers(businessId: string) {
  const couriers = await prisma.courier.findMany({
    where: { businessId, isActive: true },
    orderBy: { createdAt: 'asc' },
  })

  const withStatus = await Promise.all(
    couriers.map(async (c) => {
      const isOnline = await redis.exists(`courier:online:${c.id}`)
      return { ...c, isOnline: isOnline === 1 }
    })
  )

  return withStatus
}

export async function createCourier(
  businessId: string,
  data: { name: string; phone: string }
) {
  const phone = normalizePhone(data.phone)
  const existing = await prisma.courier.findUnique({ where: { phone } })
  if (existing) {
    throw new HttpError(409, 'Курьер с таким номером уже существует')
  }

  return prisma.courier.create({
    data: { businessId, name: data.name, phone },
  })
}

export async function updateCourier(
  id: string,
  businessId: string,
  data: { name?: string; phone?: string; photoUrl?: string }
) {
  const courier = await prisma.courier.findFirst({ where: { id, businessId } })
  if (!courier) {
    throw new HttpError(404, 'Курьер не найден')
  }

  const updateData = { ...data }
  if (updateData.phone) updateData.phone = normalizePhone(updateData.phone)
  return prisma.courier.update({ where: { id }, data: updateData })
}

export async function deactivateCourier(id: string, businessId: string) {
  const courier = await prisma.courier.findFirst({ where: { id, businessId } })
  if (!courier) {
    throw new HttpError(404, 'Курьер не найден')
  }

  return prisma.courier.update({ where: { id }, data: { isActive: false } })
}

export async function getLiveCouriers(businessId: string) {
  const couriers = await prisma.courier.findMany({
    where: { businessId, isActive: true },
    select: { id: true, name: true, photoUrl: true },
  })

  const result = await Promise.all(
    couriers.map(async (c) => {
      const [location, isOnline] = await Promise.all([
        redis.hgetall(`courier:location:${c.id}`),
        redis.exists(`courier:online:${c.id}`),
      ])

      return {
        courierId: c.id,
        name: c.name,
        photoUrl: c.photoUrl,
        isOnline: isOnline === 1,
        lat: location?.lat ? parseFloat(location.lat) : null,
        lng: location?.lng ? parseFloat(location.lng) : null,
        updatedAt: location?.updatedAt ? Number(location.updatedAt) : null,
      }
    })
  )

  return result
}
