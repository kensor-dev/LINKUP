'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface CrmAnalytics {
  segments: { NEW: number; REGULAR: number; SLEEPING: number; LOST: number }
  ltv: { avg: number; median: number }
  avgCheck: number
  totalRevenue: number
  ordersCount: number
  newCustomers: number
  revenueByDay: { date: string; revenue: number }[]
}

const SEGMENT_LABELS: Record<string, string> = {
  NEW: 'Новые',
  REGULAR: 'Постоянные',
  SLEEPING: 'Спящие',
  LOST: 'Ушедшие',
}

const SEGMENT_COLORS: Record<string, string> = {
  NEW: '#3B82F6',
  REGULAR: '#10B981',
  SLEEPING: '#F59E0B',
  LOST: '#EF4444',
}

export default function CrmAnalyticsPage() {
  const [period, setPeriod] = useState(30)

  const { data, isLoading } = useQuery<CrmAnalytics>({
    queryKey: ['analytics-crm', period],
    queryFn: () => api.get(`/api/analytics/crm?period=${period}`).then((r) => r.data),
  })

  function formatMoney(n: number) {
    return new Intl.NumberFormat('ru-RU').format(n) + ' ₽'
  }

  function RevenueChart({ data }: { data: { date: string; revenue: number }[] }) {
    if (data.length === 0) return <div className="text-sm text-gray-400 text-center py-8">Нет данных</div>
    const max = Math.max(...data.map((d) => d.revenue), 1)
    const width = 600
    const height = 120
    const barW = Math.max(4, Math.floor((width - data.length * 2) / data.length))
    const gap = Math.floor((width - barW * data.length) / (data.length + 1))

    return (
      <svg viewBox={`0 0 ${width} ${height + 20}`} className="w-full">
        {data.map((d, i) => {
          const barH = Math.max(2, (d.revenue / max) * height)
          const x = gap + i * (barW + gap)
          const y = height - barH
          return (
            <g key={d.date}>
              <rect x={x} y={y} width={barW} height={barH} fill="#1A56DB" rx="2" opacity="0.85" />
              {i % Math.ceil(data.length / 7) === 0 && (
                <text x={x + barW / 2} y={height + 14} textAnchor="middle" fontSize="9" fill="#9CA3AF">
                  {d.date.slice(5)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    )
  }

  function DonutChart({ segments }: { segments: CrmAnalytics['segments'] }) {
    const entries = Object.entries(segments).filter(([, v]) => v > 0)
    const total = entries.reduce((s, [, v]) => s + v, 0)
    if (total === 0) return <div className="text-sm text-gray-400 text-center py-4">Нет клиентов</div>

    let cumAngle = -Math.PI / 2
    const cx = 70
    const cy = 70
    const r = 55
    const inner = 30

    const slices = entries.map(([key, value]) => {
      const angle = (value / total) * 2 * Math.PI
      const start = cumAngle
      cumAngle += angle
      const x1 = cx + r * Math.cos(start)
      const y1 = cy + r * Math.sin(start)
      const x2 = cx + r * Math.cos(cumAngle)
      const y2 = cy + r * Math.sin(cumAngle)
      const xi1 = cx + inner * Math.cos(start)
      const yi1 = cy + inner * Math.sin(start)
      const xi2 = cx + inner * Math.cos(cumAngle)
      const yi2 = cy + inner * Math.sin(cumAngle)
      const large = angle > Math.PI ? 1 : 0
      return {
        key,
        value,
        d: `M${xi1} ${yi1} L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} L${xi2} ${yi2} A${inner} ${inner} 0 ${large} 0 ${xi1} ${yi1} Z`,
        color: SEGMENT_COLORS[key],
      }
    })

    return (
      <div className="flex items-center gap-6">
        <svg viewBox="0 0 140 140" className="w-36 h-36 shrink-0">
          {slices.map((s) => (
            <path key={s.key} d={s.d} fill={s.color} />
          ))}
          <text x={cx} y={cy + 5} textAnchor="middle" fontSize="14" fontWeight="600" fill="#111827">
            {total}
          </text>
        </svg>
        <div className="space-y-1.5">
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: SEGMENT_COLORS[key] }} />
              <span className="text-sm text-gray-700">{SEGMENT_LABELS[key]}</span>
              <span className="text-sm font-medium text-gray-900 ml-auto">{value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">CRM аналитика</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[7, 30, 90].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-sm px-3 py-1.5 rounded-md font-medium transition-colors ${
                period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p} дн.
            </button>
          ))}
        </div>
      </div>

      {isLoading || !data ? (
        <div className="text-center text-gray-400 text-sm py-20">Загрузка...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Выручка', value: formatMoney(data.totalRevenue) },
              { label: 'Заказов', value: data.ordersCount },
              { label: 'Средний чек', value: formatMoney(data.avgCheck) },
              { label: 'Новых клиентов', value: data.newCustomers },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className="text-2xl font-semibold text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Выручка по дням</h2>
              <RevenueChart data={data.revenueByDay} />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Сегменты клиентов</h2>
              <DonutChart segments={data.segments} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">LTV клиентов</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-gray-500 mb-1">Средний LTV</p>
                <p className="text-3xl font-semibold text-gray-900">{formatMoney(data.ltv.avg)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Медианный LTV</p>
                <p className="text-3xl font-semibold text-gray-900">{formatMoney(data.ltv.median)}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
