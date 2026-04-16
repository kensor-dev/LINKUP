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

export default function CourierAnalyticsPage() {
  const [period, setPeriod] = useState(7)

  const { data, isLoading } = useQuery<CourierAnalytics>({
    queryKey: ['analytics-couriers', period],
    queryFn: () => api.get(`/api/analytics/couriers?period=${period}`).then((r) => r.data),
  })

  function PeakHoursChart({ hours }: { hours: { hour: number; count: number }[] }) {
    const max = Math.max(...hours.map((h) => h.count), 1)
    const height = 80

    return (
      <svg viewBox="0 0 480 100" className="w-full">
        {hours.map(({ hour, count }) => {
          const barH = Math.max(count > 0 ? 3 : 0, (count / max) * height)
          const x = hour * 20 + 1
          const y = height - barH
          return (
            <g key={hour}>
              <rect x={x} y={y} width={18} height={barH} fill="#1A56DB" rx="2" opacity="0.8" />
              {hour % 3 === 0 && (
                <text x={x + 9} y={96} textAnchor="middle" fontSize="9" fill="#9CA3AF">
                  {hour}:00
                </text>
              )}
            </g>
          )
        })}
      </svg>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Аналитика курьеров</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[7, 14, 30].map((p) => (
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
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Рейтинг курьеров</h2>
            </div>
            {data.couriers.length === 0 ? (
              <div className="p-10 text-center text-gray-400 text-sm">Нет данных за период</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Курьер</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">Заказов</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">Доставлено</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">Не доставлено</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">Успешность</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">Среднее время</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.couriers.map((c, i) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{c.name}</p>
                            <p className="text-xs text-gray-400">{c.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-right text-gray-700">{c.ordersCount}</td>
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
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-right text-gray-700">
                        {c.avgDeliveryMinutes !== null ? `${c.avgDeliveryMinutes} мин` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Пиковые часы доставок</h2>
            <PeakHoursChart hours={data.peakHours} />
          </div>
        </>
      )}
    </div>
  )
}
