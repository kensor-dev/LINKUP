import { Router } from 'express'
import { authenticateBusiness } from '../middleware/auth'
import { prisma } from '../lib/prisma'

const router = Router()

router.get('/crm', authenticateBusiness, async (req, res, next) => {
  try {
    const businessId = req.user!.businessId
    const period = Number(req.query.period) || 30
    const since = new Date()
    since.setDate(since.getDate() - period)

    const [segments, profiles, recentOrders] = await Promise.all([
      prisma.customer.groupBy({
        by: ['segment'],
        where: { businessId },
        _count: { id: true },
      }),
      prisma.crmProfile.findMany({
        where: { customer: { businessId } },
        select: { totalSpent: true, ordersCount: true, lastOrderAt: true, firstOrderAt: true },
      }),
      prisma.order.findMany({
        where: {
          businessId,
          status: 'DELIVERED',
          createdAt: { gte: since },
        },
        select: {
          customerId: true,
          totalAmount: true,
          createdAt: true,
          deliveredAt: true,
          pickedUpAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    const segmentMap: Record<string, number> = { NEW: 0, REGULAR: 0, SLEEPING: 0, LOST: 0 }
    for (const s of segments) {
      segmentMap[s.segment] = s._count.id
    }

    const ltvValues = profiles.map((p) => p.totalSpent).filter((v) => v > 0)
    const avgLtv = ltvValues.length
      ? ltvValues.reduce((a, b) => a + b, 0) / ltvValues.length
      : 0

    const sorted = [...ltvValues].sort((a, b) => a - b)
    const medianLtv =
      sorted.length === 0
        ? 0
        : sorted.length % 2 === 1
        ? sorted[Math.floor(sorted.length / 2)]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2

    const totalRevenue = recentOrders.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0)
    const avgCheck = recentOrders.length ? totalRevenue / recentOrders.length : 0

    const byDay: Record<string, number> = {}
    for (const o of recentOrders) {
      const day = o.createdAt.toISOString().slice(0, 10)
      byDay[day] = (byDay[day] ?? 0) + (o.totalAmount ?? 0)
    }
    const revenueByDay = Object.entries(byDay)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const newCustomers = await prisma.customer.count({
      where: { businessId, createdAt: { gte: since } },
    })

    res.json({
      segments: segmentMap,
      ltv: { avg: Math.round(avgLtv), median: Math.round(medianLtv) },
      avgCheck: Math.round(avgCheck),
      totalRevenue: Math.round(totalRevenue),
      ordersCount: recentOrders.length,
      newCustomers,
      revenueByDay,
    })
  } catch (err) {
    next(err)
  }
})

router.get('/couriers', authenticateBusiness, async (req, res, next) => {
  try {
    const businessId = req.user!.businessId
    const period = Number(req.query.period) || 7
    const since = new Date()
    since.setDate(since.getDate() - period)

    const [couriers, orders] = await Promise.all([
      prisma.courier.findMany({
        where: { businessId, isActive: true },
        select: { id: true, name: true, phone: true },
      }),
      prisma.order.findMany({
        where: {
          businessId,
          courierId: { not: null },
          createdAt: { gte: since },
          status: { in: ['DELIVERED', 'FAILED', 'CANCELLED'] },
        },
        select: {
          courierId: true,
          status: true,
          pickedUpAt: true,
          deliveredAt: true,
          assignedAt: true,
          createdAt: true,
        },
      }),
    ])

    const stats = couriers.map((courier) => {
      const courierOrders = orders.filter((o) => o.courierId === courier.id)
      const delivered = courierOrders.filter((o) => o.status === 'DELIVERED')
      const failed = courierOrders.filter((o) => o.status === 'FAILED')

      const deliveryTimes = delivered
        .filter((o) => o.pickedUpAt && o.deliveredAt)
        .map((o) => (o.deliveredAt!.getTime() - o.pickedUpAt!.getTime()) / 60000)

      const avgDeliveryMinutes =
        deliveryTimes.length
          ? Math.round(deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length)
          : null

      return {
        id: courier.id,
        name: courier.name,
        phone: courier.phone,
        ordersCount: courierOrders.length,
        deliveredCount: delivered.length,
        failedCount: failed.length,
        avgDeliveryMinutes,
        successRate: courierOrders.length
          ? Math.round((delivered.length / courierOrders.length) * 100)
          : null,
      }
    })

    stats.sort((a, b) => b.deliveredCount - a.deliveredCount)

    const hourCounts = new Array(24).fill(0)
    for (const o of orders.filter((o) => o.status === 'DELIVERED')) {
      hourCounts[o.createdAt.getHours()]++
    }
    const peakHours = hourCounts.map((count, hour) => ({ hour, count }))

    res.json({ couriers: stats, peakHours })
  } catch (err) {
    next(err)
  }
})

export default router
