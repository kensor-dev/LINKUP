import { Router } from 'express'
import { z } from 'zod'
import { authenticateBusiness } from '../middleware/auth'
import { validate } from '../middleware/validate'
import * as courierService from '../services/courier.service'

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
      req.params.id,
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
    await courierService.deactivateCourier(req.params.id, req.user!.businessId)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
