'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface CourierStat {
  id: string
  name: string
  phone: string
  ordersCount: number
  deliveredCount: number
  failedCount: number
  avgDeliveryMinutes: number | null
  successRate: number | null
}

interface CourierAnalytics {
  couriers: CourierStat[]
  peakHours: { hour: number; count: number }[]
}

function PeakHoursChart({ hours }: { hours: { hour: number; count: number }[] }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const max = Math.max(...hours.map((h) => h.count), 1)
  const chartW = 560
  const chartH = 140
  const paddingBottom = 24
  const paddingTop = 12
  const innerH = chartH - paddingBottom - paddingTop
  const barW = Math.floor(chartW / 24) - 3
  const gridLines = 4

  return (
    <svg
      viewBox={`0 0 ${chartW} ${chartH}`}
      className="w-full"
      onMouseLeave={() => setHovered(null)}
    >
      <defs>
        <linearGradient id="peakGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="peakGradHover" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {Array.from({ length: gridLines }).map((_, i) => {
        const y = paddingTop + (innerH / gridLines) * i
        return (
          <line key={i} x1={0} y1={y} x2={chartW} y2={y}
            stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />
        )
      })}

      {hours.map(({ hour, count }) => {
        const barH = Math.max(count > 0 ? 3 : 0, (count / max) * innerH)
        const x = hour * (chartW / 24) + 1
        const y = paddingTop + innerH - barH
        const isHov = hovered === hour

        return (
          <g key={hour} onMouseEnter={() => setHovered(hour)}>
            <rect
              x={x} y={y} width={barW} height={barH}
              fill={isHov ? 'url(#peakGradHover)' : 'url(#peakGrad)'}
              rx="4" ry="4"
              style={{ transition: 'fill 0.15s' }}
            />
            {isHov && count > 0 && (
              <>
                <rect x={Math.min(x - 8, chartW - 80)} y={y - 30} width={72} height={22} fill="#0F172A" rx="6" />
                <text x={Math.min(x - 8, chartW - 80) + 36} y={y - 14}
                  textAnchor="middle" fontSize="10" fill="white" fontWeight="600">
                  {count} зак.
                </text>
              </>
            )}
            {hour % 3 === 0 && (
              <text x={x + barW / 2} y={chartH - 4}
                textAnchor="middle" fontSize="9" fill="#94A3B8">
                {hour}:00
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export default function CourierAnalyticsPage() {
  const [period, setPeriod] = useState(7)

  const { data, isLoading } = useQuery<CourierAnalytics>({
    queryKey: ['analytics-couriers', period],
    queryFn: () => api.get(`/api/analytics/couriers?period=${period}`).then((r) => r.data),
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Аналитика курьеров</h1>
        <div className="flex gap-1 bg-slate-200 rounded-lg p-1">
          {[7, 14, 30].map((p) => (
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
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">Рейтинг курьеров</h2>
            </div>
            {data.couriers.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">Нет данных за период</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Курьер</th>
                    <th className="text-right text-xs font-medium text-slate-500 px-5 py-3">Заказов</th>
                    <th className="text-right text-xs font-medium text-slate-500 px-5 py-3">Доставлено</th>
                    <th className="text-right text-xs font-medium text-slate-500 px-5 py-3">Не доставлено</th>
                    <th className="text-right text-xs font-medium text-slate-500 px-5 py-3">Успешность</th>
                    <th className="text-right text-xs font-medium text-slate-500 px-5 py-3">Среднее время</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.couriers.map((c, i) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs text-slate-400 w-4">{i + 1}</span>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{c.name}</p>
                            <p className="text-xs text-slate-400">{c.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-right text-slate-700">{c.ordersCount}</td>
                      <td className="px-5 py-3.5 text-sm text-right text-green-600 font-medium">{c.deliveredCount}</td>
                      <td className="px-5 py-3.5 text-sm text-right text-red-500">{c.failedCount}</td>
                      <td className="px-5 py-3.5 text-right">
                        {c.successRate !== null ? (
                          <span className={`text-sm font-medium ${
                            c.successRate >= 90 ? 'text-green-600' :
                            c.successRate >= 70 ? 'text-yellow-600' : 'text-red-500'
                          }`}>
                            {c.successRate}%
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-right text-slate-700">
                        {c.avgDeliveryMinutes !== null ? `${c.avgDeliveryMinutes} мин` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Пиковые часы доставок</h2>
            <PeakHoursChart hours={data.peakHours} />
          </div>
        </>
      )}
    </div>
  )
}
