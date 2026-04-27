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

function formatMoney(n: number) {
  return new Intl.NumberFormat('ru-RU').format(n) + ' ₽'
}

function RevenueChart({ data }: { data: { date: string; revenue: number }[] }) {
  const [hovered, setHovered] = useState<number | null>(null)

  if (data.length === 0) {
    return <div className="text-sm text-slate-400 text-center py-8">Нет данных</div>
  }

  const max = Math.max(...data.map((d) => d.revenue), 1)
  const chartH = 140
  const chartW = 560
  const paddingBottom = 24
  const paddingTop = 12
  const innerH = chartH - paddingBottom - paddingTop
  const barW = Math.max(6, Math.floor((chartW - data.length * 3) / data.length))
  const step = (chartW - barW) / Math.max(data.length - 1, 1)
  const gridLines = 4

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="w-full"
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="barGradHover" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {Array.from({ length: gridLines }).map((_, i) => {
          const y = paddingTop + (innerH / gridLines) * i
          return (
            <line
              key={i}
              x1={0} y1={y} x2={chartW} y2={y}
              stroke="#E2E8F0"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          )
        })}

        {data.map((d, i) => {
          const barH = Math.max(3, (d.revenue / max) * innerH)
          const x = i * step
          const y = paddingTop + innerH - barH
          const isHov = hovered === i
          const showLabel = data.length <= 14 || i % Math.ceil(data.length / 10) === 0

          return (
            <g key={d.date} onMouseEnter={() => setHovered(i)}>
              <rect
                x={x} y={paddingTop + innerH - barH}
                width={barW} height={barH}
                fill={isHov ? 'url(#barGradHover)' : 'url(#barGrad)'}
                rx="4" ry="4"
                style={{ transition: 'fill 0.15s' }}
              />
              {isHov && (
                <>
                  <rect
                    x={Math.min(x - 2, chartW - 110)} y={y - 32}
                    width={108} height={22}
                    fill="#0F172A" rx="6"
                  />
                  <text
                    x={Math.min(x - 2, chartW - 110) + 54} y={y - 16}
                    textAnchor="middle" fontSize="10" fill="white" fontWeight="600"
                  >
                    {formatMoney(d.revenue)}
                  </text>
                </>
              )}
              {showLabel && (
                <text
                  x={x + barW / 2} y={chartH - 4}
                  textAnchor="middle" fontSize="9" fill="#94A3B8"
                >
                  {d.date.slice(5)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function DonutChart({ segments }: { segments: CrmAnalytics['segments'] }) {
  const entries = Object.entries(segments).filter(([, v]) => v > 0)
  const total = entries.reduce((s, [, v]) => s + v, 0)
  if (total === 0) {
    return <div className="text-sm text-slate-400 text-center py-4">Нет клиентов</div>
  }

  let cumAngle = -Math.PI / 2
  const cx = 70; const cy = 70; const r = 55; const inner = 32

  const slices = entries.map(([key, value]) => {
    const angle = (value / total) * 2 * Math.PI
    const start = cumAngle
    cumAngle += angle
    const x1 = cx + r * Math.cos(start); const y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(cumAngle); const y2 = cy + r * Math.sin(cumAngle)
    const xi1 = cx + inner * Math.cos(start); const yi1 = cy + inner * Math.sin(start)
    const xi2 = cx + inner * Math.cos(cumAngle); const yi2 = cy + inner * Math.sin(cumAngle)
    const large = angle > Math.PI ? 1 : 0
    return {
      key, value,
      d: `M${xi1} ${yi1} L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} L${xi2} ${yi2} A${inner} ${inner} 0 ${large} 0 ${xi1} ${yi1} Z`,
      color: SEGMENT_COLORS[key],
    }
  })

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 140 140" className="w-36 h-36 shrink-0">
        {slices.map((s) => <path key={s.key} d={s.d} fill={s.color} />)}
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="14" fontWeight="600" fill="#0F172A">
          {total}
        </text>
      </svg>
      <div className="space-y-1.5">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: SEGMENT_COLORS[key] }} />
            <span className="text-sm text-slate-600">{SEGMENT_LABELS[key]}</span>
            <span className="text-sm font-semibold text-slate-900 ml-auto pl-4">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CrmAnalyticsPage() {
  const [period, setPeriod] = useState(30)

  const { data, isLoading } = useQuery<CrmAnalytics>({
    queryKey: ['analytics-crm', period],
    queryFn: () => api.get(`/api/analytics/crm?period=${period}`).then((r) => r.data),
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">CRM аналитика</h1>
        <div className="flex gap-1 bg-slate-200 rounded-lg p-1">
          {[7, 30, 90].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-sm px-3 py-1.5 rounded-md font-medium transition-colors ${
                period === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p} дн.
            </button>
          ))}
        </div>
      </div>

      {isLoading || !data ? (
        <div className="text-center text-slate-400 text-sm py-20">Загрузка...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Выручка', value: formatMoney(data.totalRevenue) },
              { label: 'Заказов', value: data.ordersCount },
              { label: 'Средний чек', value: formatMoney(data.avgCheck) },
              { label: 'Новых клиентов', value: data.newCustomers },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                <p className="text-2xl font-semibold text-slate-900">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Выручка по дням</h2>
              <RevenueChart data={data.revenueByDay} />
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Сегменты клиентов</h2>
              <DonutChart segments={data.segments} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-5">LTV клиентов</h2>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-xs text-slate-500 mb-1">Средний LTV</p>
                <p className="text-3xl font-semibold text-slate-900">{formatMoney(data.ltv.avg)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Медианный LTV</p>
                <p className="text-3xl font-semibold text-slate-900">{formatMoney(data.ltv.median)}</p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Расшифровка терминов</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-700 mb-1">LTV (Lifetime Value)</p>
                  <p className="text-xs text-slate-500 leading-relaxed">Суммарная выручка, которую приносит один клиент за всё время работы с вами.</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-700 mb-1">Средний LTV</p>
                  <p className="text-xs text-slate-500 leading-relaxed">Среднее значение LTV по всем клиентам. Чувствителен к крупным единичным заказам.</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-700 mb-1">Медианный LTV</p>
                  <p className="text-xs text-slate-500 leading-relaxed">Значение, выше и ниже которого находится ровно половина клиентов. Устойчив к выбросам.</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
