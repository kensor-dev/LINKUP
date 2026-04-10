import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: false,
})

redis.on('connect', () => {
  console.log('[redis] подключён')
})

redis.on('error', (err) => {
  console.error('[redis] ошибка:', err.message)
})
