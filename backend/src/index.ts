import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createServer } from 'http'
import { initSocket } from './socket'
import { errorHandler } from './middleware/errorHandler'
import { prisma } from './lib/prisma'
import { redis } from './lib/redis'
import authRouter from './routes/auth'

const app = express()
const httpServer = createServer(app)

app.use(helmet())
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
)
app.use(express.json({ limit: '1mb' }))

app.use('/api/auth', authRouter)

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

const PORT = Number(process.env.PORT) || 3001

httpServer.listen(PORT, () => {
  console.log(`[server] LINKUP backend запущен на http://localhost:${PORT}`)
})
