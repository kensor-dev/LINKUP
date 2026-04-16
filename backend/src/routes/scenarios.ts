import { Router } from 'express'
import { z } from 'zod'
import { authenticateBusiness } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { prisma } from '../lib/prisma'
import { HttpError } from '../middleware/errorHandler'

const router = Router()

const actionSchema = z.object({
  type: z.enum(['create_task', 'send_sms', 'send_whatsapp', 'add_tag']),
  params: z.record(z.string(), z.unknown()),
})

const createSchema = z.object({
  name: z.string().min(1),
  triggerType: z.enum([
    'courier_late',
    'order_failed',
    'no_order_days',
    'first_order',
    'nth_order',
    'ltv_threshold',
  ]),
  triggerParams: z.record(z.string(), z.unknown()).default({}),
  actions: z.array(actionSchema).min(1),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  triggerParams: z.record(z.string(), z.unknown()).optional(),
  actions: z.array(actionSchema).optional(),
})

router.get('/', authenticateBusiness, async (req, res, next) => {
  try {
    const scenarios = await prisma.scenario.findMany({
      where: { businessId: req.user!.businessId },
      orderBy: { createdAt: 'desc' },
    })
    res.json(scenarios)
  } catch (err) {
    next(err)
  }
})

router.post('/', authenticateBusiness, validate(createSchema), async (req, res, next) => {
  try {
    const scenario = await prisma.scenario.create({
      data: {
        businessId: req.user!.businessId,
        name: req.body.name,
        triggerType: req.body.triggerType,
        triggerParams: req.body.triggerParams,
        actions: req.body.actions,
      },
    })
    res.status(201).json(scenario)
  } catch (err) {
    next(err)
  }
})

router.patch('/:id', authenticateBusiness, validate(updateSchema), async (req, res, next) => {
  try {
    const existing = await prisma.scenario.findFirst({
      where: { id: String(req.params.id), businessId: req.user!.businessId },
    })
    if (!existing) throw new HttpError(404, 'Сценарий не найден')

    const scenario = await prisma.scenario.update({
      where: { id: String(req.params.id) },
      data: {
        ...(req.body.name !== undefined && { name: req.body.name }),
        ...(req.body.isActive !== undefined && { isActive: req.body.isActive }),
        ...(req.body.triggerParams !== undefined && { triggerParams: req.body.triggerParams }),
        ...(req.body.actions !== undefined && { actions: req.body.actions }),
      },
    })
    res.json(scenario)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', authenticateBusiness, async (req, res, next) => {
  try {
    const existing = await prisma.scenario.findFirst({
      where: { id: String(req.params.id), businessId: req.user!.businessId },
    })
    if (!existing) throw new HttpError(404, 'Сценарий не найден')
    await prisma.scenario.delete({ where: { id: String(req.params.id) } })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

router.get('/:id/logs', authenticateBusiness, async (req, res, next) => {
  try {
    const existing = await prisma.scenario.findFirst({
      where: { id: String(req.params.id), businessId: req.user!.businessId },
    })
    if (!existing) throw new HttpError(404, 'Сценарий не найден')

    const logs = await prisma.scenarioLog.findMany({
      where: { scenarioId: String(req.params.id) },
      orderBy: { executedAt: 'desc' },
      take: 50,
    })
    res.json(logs)
  } catch (err) {
    next(err)
  }
})

export default router
