import { Router } from 'express'
import { z } from 'zod'
import { authenticateBusiness } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { prisma } from '../lib/prisma'
import { HttpError } from '../middleware/errorHandler'

const router = Router()

const updateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

router.get('/', authenticateBusiness, async (req, res, next) => {
  try {
    const { segment, search } = req.query as Record<string, string>
    const where: Record<string, unknown> = { businessId: req.user!.businessId }

    if (segment) where.segment = segment
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ]
    }

    const customers = await prisma.customer.findMany({
      where,
      include: { profile: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    res.json(customers)
  } catch (err) {
    next(err)
  }
})

router.get('/:id', authenticateBusiness, async (req, res, next) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: String(req.params.id), businessId: req.user!.businessId },
      include: {
        profile: true,
        orders: {
          include: { courier: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        tasks: {
          where: { status: 'OPEN' },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!customer) throw new HttpError(404, 'Клиент не найден')
    res.json(customer)
  } catch (err) {
    next(err)
  }
})

router.patch('/:id', authenticateBusiness, validate(updateSchema), async (req, res, next) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: String(req.params.id), businessId: req.user!.businessId },
    })
    if (!customer) throw new HttpError(404, 'Клиент не найден')

    const updated = await prisma.customer.update({
      where: { id: String(req.params.id) },
      data: req.body,
    })
    res.json(updated)
  } catch (err) {
    next(err)
  }
})

export default router
