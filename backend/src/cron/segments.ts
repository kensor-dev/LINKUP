import cron from 'node-cron'
import { prisma } from '../lib/prisma'

async function recalcSegments() {
  const now = new Date()
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const d90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  const profiles = await prisma.crmProfile.findMany({
    select: { customerId: true, ordersCount: true, lastOrderAt: true },
  })

  const updates = profiles.map((p) => {
    let segment: 'NEW' | 'REGULAR' | 'SLEEPING' | 'LOST' = 'NEW'
    if (!p.lastOrderAt || p.ordersCount === 0) {
      segment = 'NEW'
    } else if (p.lastOrderAt < d90) {
      segment = 'LOST'
    } else if (p.lastOrderAt < d30) {
      segment = 'SLEEPING'
    } else if (p.ordersCount > 2) {
      segment = 'REGULAR'
    } else {
      segment = 'NEW'
    }
    return prisma.customer.update({
      where: { id: p.customerId },
      data: { segment },
    })
  })

  await prisma.$transaction(updates)
  console.log(`[cron] segments recalculated for ${profiles.length} customers`)
}

export function startSegmentsCron() {
  cron.schedule('0 3 * * *', recalcSegments)
  console.log('[cron] segments cron scheduled at 03:00')
}
