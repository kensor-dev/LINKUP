import { Router } from 'express'
import { z } from 'zod'
import { authenticateBusiness } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { prisma } from '../lib/prisma'
import { HttpError } from '../middleware/errorHandler'

const router = Router()

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  customerId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  assignedToId: z.string().uuid().optional(),
  dueAt: z.string().datetime().optional(),
})

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['OPEN', 'DONE']).optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
})

router.get('/', authenticateBusiness, async (req, res, next) => {
  try {
    const { status, assignedToId } = req.query
    const tasks = await prisma.task.findMany({
      where: {
        businessId: req.user!.businessId,
        ...(status ? { status: status as 'OPEN' | 'DONE' } : {}),
        ...(assignedToId ? { assignedToId: String(assignedToId) } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        assignedTo: { select: { id: true, name: true } },
        order: { select: { id: true, deliveryAddress: true } },
      },
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
    })
    res.json(tasks)
  } catch (err) {
    next(err)
  }
})

router.post('/', authenticateBusiness, validate(createSchema), async (req, res, next) => {
  try {
    const task = await prisma.task.create({
      data: {
        businessId: req.user!.businessId,
        title: req.body.title,
        description: req.body.description,
        customerId: req.body.customerId,
        orderId: req.body.orderId,
        assignedToId: req.body.assignedToId,
        dueAt: req.body.dueAt ? new Date(req.body.dueAt) : undefined,
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    })
    res.status(201).json(task)
  } catch (err) {
    next(err)
  }
})

router.patch('/:id', authenticateBusiness, validate(updateSchema), async (req, res, next) => {
  try {
    const existing = await prisma.task.findFirst({
      where: { id: req.params.id, businessId: req.user!.businessId },
    })
    if (!existing) throw new HttpError(404, 'Задача не найдена')

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...(req.body.title !== undefined && { title: req.body.title }),
        ...(req.body.description !== undefined && { description: req.body.description }),
        ...(req.body.status !== undefined && {
          status: req.body.status,
          doneAt: req.body.status === 'DONE' ? new Date() : null,
        }),
        ...(req.body.assignedToId !== undefined && { assignedToId: req.body.assignedToId }),
        ...(req.body.dueAt !== undefined && {
          dueAt: req.body.dueAt ? new Date(req.body.dueAt) : null,
        }),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    })
    res.json(task)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', authenticateBusiness, async (req, res, next) => {
  try {
    const existing = await prisma.task.findFirst({
      where: { id: req.params.id, businessId: req.user!.businessId },
    })
    if (!existing) throw new HttpError(404, 'Задача не найдена')
    await prisma.task.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
