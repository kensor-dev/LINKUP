import { Router } from 'express'
import { z } from 'zod'
import { authenticateCourier } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { redis } from '../lib/redis'
import { prisma } from '../lib/prisma'
import { getIO } from '../socket'

const router = Router()

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

router.post('/location', authenticateCourier, validate(locationSchema), async (req, res, next) => {
  try {
    const { lat, lng } = req.body
    const { courierId, businessId } = req.courier!

    // 1. Обновить Redis (быстро)
    await redis.hset(`courier:location:${courierId}`, {
      lat: String(lat),
      lng: String(lng),
      updatedAt: String(Date.now()),
    })
    await redis.expire(`courier:location:${courierId}`, 30)
    await redis.set(`courier:online:${courierId}`, '1', 'EX', 35)

    // 2. Emit через Socket.io (быстро)
    const io = getIO()
    io.to(`business:${businessId}`).emit('courier:location', { courierId, lat, lng })

    // Проверить активный заказ курьера и оповестить клиента
    const activeOrder = await prisma.order.findFirst({
      where: {
        courierId,
        status: { in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] },
      },
      select: { id: true },
    })
    if (activeOrder) {
      io.to(`order:${activeOrder.id}`).emit('courier:location', { courierId, lat, lng })
    }

    // 3. Ответить СЕЙЧАС
    res.json({ ok: true })

    // 4. Записать в PostgreSQL асинхронно (не блокируем ответ)
    prisma.courierLocation
      .create({ data: { courierId, lat, lng } })
      .catch((err) => console.error('[gps] ошибка записи в БД:', err))
  } catch (err) {
    next(err)
  }
})

router.post('/online', authenticateCourier, async (req, res, next) => {
  try {
    const { courierId } = req.courier!
    await redis.set(`courier:online:${courierId}`, '1', 'EX', 35)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

router.post('/offline', authenticateCourier, async (req, res, next) => {
  try {
    const { courierId } = req.courier!
    await redis.del(`courier:online:${courierId}`)
    await redis.del(`courier:location:${courierId}`)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
