import { Router } from 'express'
import { z } from 'zod'
import { OrderStatus } from '@prisma/client'
import { authenticateBusiness } from '../middleware/auth'
import { validate } from '../middleware/validate'
import * as orderService from '../services/order.service'

const router = Router()

const createSchema = z.object({
  customerPhone: z.string().min(10),
  customerName: z.string().optional(),
  address: z.string().min(5),
  items: z
    .array(z.object({ name: z.string(), qty: z.number(), price: z.number() }))
    .optional(),
  notes: z.string().optional(),
  courierId: z.string().uuid().optional(),
  totalAmount: z.number().positive().optional(),
})

const assignSchema = z.object({
  courierId: z.string().uuid(),
})

const statusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  comment: z.string().optional(),
})

router.get('/', authenticateBusiness, async (req, res, next) => {
  try {
    const { status, courierId, date, search } = req.query as Record<string, string>
    const orders = await orderService.getOrders(req.user!.businessId, {
      status,
      courierId,
      date,
      search,
    })
    res.json(orders)
  } catch (err) {
    next(err)
  }
})

router.post('/', authenticateBusiness, validate(createSchema), async (req, res, next) => {
  try {
    const order = await orderService.createOrder(req.user!.businessId, req.body)
    res.status(201).json(order)
  } catch (err) {
    next(err)
  }
})

router.get('/:id', authenticateBusiness, async (req, res, next) => {
  try {
    const order = await orderService.getOrder(req.params.id, req.user!.businessId)
    res.json(order)
  } catch (err) {
    next(err)
  }
})

router.patch('/:id/assign', authenticateBusiness, validate(assignSchema), async (req, res, next) => {
  try {
    const order = await orderService.assignCourier(
      req.params.id,
      req.user!.businessId,
      req.body.courierId
    )
    res.json(order)
  } catch (err) {
    next(err)
  }
})

router.patch('/:id/status', authenticateBusiness, validate(statusSchema), async (req, res, next) => {
  try {
    const order = await orderService.updateOrderStatus(
      req.params.id,
      req.user!.businessId,
      req.body.status,
      req.body.comment
    )
    res.json(order)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', authenticateBusiness, async (req, res, next) => {
  try {
    await orderService.cancelOrder(req.params.id, req.user!.businessId)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
