import 'dotenv/config'
import path from 'path'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createServer } from 'http'
import { initSocket } from './socket'
import { errorHandler } from './middleware/errorHandler'
import { prisma } from './lib/prisma'
import { redis } from './lib/redis'
import authRouter from './routes/auth'
import couriersRouter from './routes/couriers'
import gpsRouter from './routes/gps'
import ordersRouter from './routes/orders'
import trackingRouter from './routes/tracking'
import customersRouter from './routes/customers'
import settingsRouter from './routes/settings'
import tasksRouter from './routes/tasks'
import analyticsRouter from './routes/analytics'
import { startSegmentsCron } from './cron/segments'
import { startScenariosCron } from './cron/scenarios'
import scenariosRouter from './routes/scenarios'

const app = express()
const httpServer = createServer(app)

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
)
app.use(express.json({ limit: '1mb' }))
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

app.use('/api/auth', authRouter)
app.use('/api/couriers', couriersRouter)
app.use('/api/gps', gpsRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/tracking', trackingRouter)
app.use('/api/customers', customersRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/tasks', tasksRouter)
app.use('/api/scenarios', scenariosRouter)
app.use('/api/analytics', analyticsRouter)

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    const pong = await redis.ping()
    res.json({ ok: true, db: 'up', redis: pong === 'PONG' ? 'up' : 'down' })
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message })
  }
})

app.use(errorHandler)

initSocket(httpServer)
startSegmentsCron()
startScenariosCron()

const PORT = Number(process.env.PORT) || 3001

httpServer.listen(PORT, () => {
  console.log(`[server] LINKUP backend запущен на http://localhost:${PORT}`)
})
