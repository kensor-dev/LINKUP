import { Router } from 'express'
import { z } from 'zod'
import { OrderStatus } from '@prisma/client'
import { authenticateBusiness, authenticateCourier } from '../middleware/auth'
import { validate } from '../middleware/validate'
import * as courierService from '../services/courier.service'
import { prisma } from '../lib/prisma'
import { HttpError } from '../middleware/errorHandler'

const router = Router()

const createSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
})

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  photoUrl: z.string().url().optional(),
})

router.get('/', authenticateBusiness, async (req, res, next) => {
  try {
    const couriers = await courierService.getCouriers(req.user!.businessId)
    res.json(couriers)
  } catch (err) {
    next(err)
  }
})

router.get('/live', authenticateBusiness, async (req, res, next) => {
  try {
    const live = await courierService.getLiveCouriers(req.user!.businessId)
    res.json(live)
  } catch (err) {
    next(err)
  }
})

router.post('/', authenticateBusiness, validate(createSchema), async (req, res, next) => {
  try {
    const courier = await courierService.createCourier(req.user!.businessId, req.body)
    res.status(201).json(courier)
  } catch (err) {
    next(err)
  }
})

router.patch('/:id', authenticateBusiness, validate(updateSchema), async (req, res, next) => {
  try {
    const courier = await courierService.updateCourier(
      String(req.params.id),
      req.user!.businessId,
      req.body
    )
    res.json(courier)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', authenticateBusiness, async (req, res, next) => {
  try {
    await courierService.deactivateCourier(String(req.params.id), req.user!.businessId)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// ─── Мобильное приложение курьера ─────────────────────────────────────────────

router.post('/push-token', authenticateCourier, async (req, res, next) => {
  try {
    const { token } = req.body
    if (!token) return res.json({ ok: true })
    await prisma.courier.update({
      where: { id: req.courier!.courierId },
      data: { pushToken: token },
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

router.get('/my-orders', authenticateCourier, async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        courierId: req.courier!.courierId,
        status: { not: 'CANCELLED' },
      },
      select: {
        id: true,
        status: true,
        deliveryAddress: true,
        totalAmount: true,
        notes: true,
        createdAt: true,
        customer: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    res.json(orders)
  } catch (err) {
    next(err)
  }
})

router.get('/my-orders/:id', authenticateCourier, async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: String(req.params.id), courierId: req.courier!.courierId },
      include: {
        customer: { select: { name: true, phone: true } },
        business: { select: { name: true } },
      },
    })
    if (!order) throw new HttpError(404, 'Заказ не найден')
    res.json(order)
  } catch (err) {
    next(err)
  }
})

const courierStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
})

router.patch('/my-orders/:id/status', authenticateCourier, validate(courierStatusSchema), async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: String(req.params.id), courierId: req.courier!.courierId },
    })
    if (!order) throw new HttpError(404, 'Заказ не найден')

    const allowed: Record<string, OrderStatus[]> = {
      ASSIGNED: ['PICKED_UP', 'FAILED'],
      PICKED_UP: ['IN_TRANSIT'],
      IN_TRANSIT: ['DELIVERED', 'FAILED'],
    }

    const next = allowed[order.status]
    if (!next?.includes(req.body.status)) {
      throw new HttpError(400, 'Недопустимое изменение статуса')
    }

    const updated = await prisma.$transaction(async (tx) => {
      const o = await tx.order.update({
        where: { id: order.id },
        data: {
          status: req.body.status,
          ...(req.body.status === 'PICKED_UP' && { pickedUpAt: new Date() }),
          ...(req.body.status === 'DELIVERED' && { deliveredAt: new Date() }),
        },
      })
      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: req.body.status },
      })
      return o
    })

    res.json(updated)
  } catch (err) {
    next(err)
  }
})

export default router
