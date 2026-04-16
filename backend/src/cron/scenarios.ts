import cron from 'node-cron'
import { prisma } from '../lib/prisma'

interface Action {
  type: 'create_task' | 'send_sms' | 'send_whatsapp' | 'add_tag'
  params: Record<string, unknown>
}

interface ScenarioContext {
  customerId: string
  orderId?: string
  customerName?: string
  customerPhone?: string
  businessId: string
}

async function alreadyFiredToday(scenarioId: string, customerId: string): Promise<boolean> {
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  const log = await prisma.scenarioLog.findFirst({
    where: { scenarioId, customerId, executedAt: { gte: since } },
  })
  return !!log
}

async function executeActions(
  scenarioId: string,
  actions: Action[],
  ctx: ScenarioContext
) {
  const results: string[] = []

  for (const action of actions) {
    try {
      if (action.type === 'create_task') {
        const title = String(action.params.title ?? 'Задача от сценария').replace(
          '{{name}}',
          ctx.customerName ?? ctx.customerPhone ?? ''
        )
        await prisma.task.create({
          data: {
            businessId: ctx.businessId,
            customerId: ctx.customerId,
            orderId: ctx.orderId,
            title,
            description: action.params.description ? String(action.params.description) : undefined,
          },
        })
        results.push(`task_created: ${title}`)
      } else if (action.type === 'add_tag') {
        const tag = String(action.params.tag ?? '')
        if (tag) {
          const customer = await prisma.customer.findUnique({ where: { id: ctx.customerId } })
          if (customer && !customer.tags.includes(tag)) {
            await prisma.customer.update({
              where: { id: ctx.customerId },
              data: { tags: { push: tag } },
            })
            results.push(`tag_added: ${tag}`)
          }
        }
      } else if (action.type === 'send_sms' || action.type === 'send_whatsapp') {
        const text = String(action.params.text ?? '')
          .replace('{{name}}', ctx.customerName ?? '')
          .replace('{{phone}}', ctx.customerPhone ?? '')
        await prisma.notificationLog.create({
          data: {
            businessId: ctx.businessId,
            customerId: ctx.customerId,
            orderId: ctx.orderId,
            channel: action.type === 'send_sms' ? 'sms' : 'whatsapp',
            text,
            status: 'pending',
          },
        })
        results.push(`${action.type}: queued`)
      }
    } catch (err) {
      results.push(`error: ${(err as Error).message}`)
    }
  }

  await prisma.scenarioLog.create({
    data: {
      scenarioId,
      customerId: ctx.customerId,
      orderId: ctx.orderId,
      status: 'ok',
      resultJson: results,
    },
  })

  await prisma.scenario.update({
    where: { id: scenarioId },
    data: { runsCount: { increment: 1 } },
  })
}

async function runTimeBasedScenarios() {
  const scenarios = await prisma.scenario.findMany({
    where: {
      isActive: true,
      triggerType: { in: ['no_order_days', 'ltv_threshold'] },
    },
  })

  for (const scenario of scenarios) {
    const params = scenario.triggerParams as Record<string, unknown>

    if (scenario.triggerType === 'no_order_days') {
      const days = Number(params.days ?? 30)
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - days)

      const customers = await prisma.customer.findMany({
        where: {
          businessId: scenario.businessId,
          profile: { lastOrderAt: { lt: cutoff } },
        },
        include: { profile: true },
      })

      for (const customer of customers) {
        if (await alreadyFiredToday(scenario.id, customer.id)) continue
        await executeActions(scenario.id, scenario.actions as unknown as Action[], {
          customerId: customer.id,
          customerName: customer.name ?? undefined,
          customerPhone: customer.phone,
          businessId: scenario.businessId,
        })
      }
    } else if (scenario.triggerType === 'ltv_threshold') {
      const amount = Number(params.amount ?? 10000)

      const profiles = await prisma.crmProfile.findMany({
        where: {
          customer: { businessId: scenario.businessId },
          totalSpent: { gte: amount },
        },
        include: { customer: true },
      })

      for (const profile of profiles) {
        if (await alreadyFiredToday(scenario.id, profile.customerId)) continue
        await executeActions(scenario.id, scenario.actions as unknown as Action[], {
          customerId: profile.customerId,
          customerName: profile.customer.name ?? undefined,
          customerPhone: profile.customer.phone,
          businessId: scenario.businessId,
        })
      }
    }
  }
}

export async function triggerEventScenarios(
  eventType: 'order_failed' | 'first_order' | 'nth_order' | 'courier_late',
  ctx: ScenarioContext & { nthOrderCount?: number; lateMinutes?: number }
) {
  const scenarios = await prisma.scenario.findMany({
    where: { businessId: ctx.businessId, isActive: true, triggerType: eventType },
  })

  for (const scenario of scenarios) {
    const params = scenario.triggerParams as Record<string, unknown>

    if (eventType === 'nth_order') {
      const requiredCount = Number(params.count ?? 5)
      if (ctx.nthOrderCount !== requiredCount) continue
    }

    if (eventType === 'courier_late') {
      const minMinutes = Number(params.minutes ?? 30)
      if ((ctx.lateMinutes ?? 0) < minMinutes) continue
    }

    if (await alreadyFiredToday(scenario.id, ctx.customerId)) continue

    await executeActions(scenario.id, scenario.actions as unknown as Action[], ctx)
  }
}

export function startScenariosCron() {
  cron.schedule('*/15 * * * *', async () => {
    try {
      await runTimeBasedScenarios()
    } catch (err) {
      console.error('[cron] scenarios error:', err)
    }
  })
  console.log('[cron] scenarios cron scheduled every 15 min')
}
