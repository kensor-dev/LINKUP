import { Router } from 'express'
import { z } from 'zod'
import { authenticateBusiness } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { prisma } from '../lib/prisma'
import { HttpError } from '../middleware/errorHandler'

const router = Router()

const createSchema = z.object({
  courierId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
})

const updateSchema = z.object({
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
})

router.get('/', authenticateBusiness, async (req, res, next) => {
  try {
    const { date, courierId, week } = req.query as Record<string, string>
    const where: Record<string, unknown> = { businessId: req.user!.businessId }

    if (date) {
      where.date = new Date(date)
    } else if (week) {
      const start = new Date(week)
      const end = new Date(week)
      end.setDate(end.getDate() + 7)
      where.date = { gte: start, lt: end }
    }

    if (courierId) where.courierId = courierId

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        courier: { select: { id: true, name: true, phone: true } },
      },
      orderBy: [{ date: 'asc' }, { startsAt: 'asc' }],
    })
    res.json(shifts)
  } catch (err) {
    next(err)
  }
})

router.post('/', authenticateBusiness, validate(createSchema), async (req, res, next) => {
  try {
    const courierBelongs = await prisma.courier.findFirst({
      where: { id: req.body.courierId, businessId: req.user!.businessId },
    })
    if (!courierBelongs) throw new HttpError(403, 'Курьер не найден')

    const shift = await prisma.shift.create({
      data: {
        businessId: req.user!.businessId,
        courierId: req.body.courierId,
        date: new Date(req.body.date),
        startsAt: new Date(req.body.startsAt),
        endsAt: new Date(req.body.endsAt),
      },
      include: {
        courier: { select: { id: true, name: true } },
      },
    })
    res.status(201).json(shift)
  } catch (err) {
    next(err)
  }
})

router.patch('/:id', authenticateBusiness, validate(updateSchema), async (req, res, next) => {
  try {
    const existing = await prisma.shift.findFirst({
      where: { id: String(req.params.id), businessId: req.user!.businessId },
    })
    if (!existing) throw new HttpError(404, 'Смена не найдена')

    const shift = await prisma.shift.update({
      where: { id: String(req.params.id) },
      data: {
        ...(req.body.startsAt && { startsAt: new Date(req.body.startsAt) }),
        ...(req.body.endsAt && { endsAt: new Date(req.body.endsAt) }),
      },
      include: {
        courier: { select: { id: true, name: true } },
      },
    })
    res.json(shift)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', authenticateBusiness, async (req, res, next) => {
  try {
    const existing = await prisma.shift.findFirst({
      where: { id: String(req.params.id), businessId: req.user!.businessId },
    })
    if (!existing) throw new HttpError(404, 'Смена не найдена')
    await prisma.shift.delete({ where: { id: String(req.params.id) } })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
