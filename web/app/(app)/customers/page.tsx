'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface Customer {
  id: string
  name: string | null
  phone: string
  email: string | null
  segment: string
  tags: string[]
  createdAt: string
  profile: {
    ordersCount: number
    totalSpent: number
    lastOrderAt: string | null
  } | null
}

const SEGMENT_LABELS: Record<string, string> = {
  NEW: 'Новый',
  REGULAR: 'Постоянный',
  SLEEPING: 'Засыпает',
  LOST: 'Потерян',
}

const SEGMENT_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  REGULAR: 'bg-green-100 text-green-700',
  SLEEPING: 'bg-yellow-100 text-yellow-700',
  LOST: 'bg-red-100 text-red-700',
}

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState('')

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['customers', segment, search],
    queryFn: () =>
      api.get('/api/customers', {
        params: { segment: segment || undefined, search: search || undefined },
      }).then((r) => r.data),
  })

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Клиенты</h1>

      <div className="flex gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по имени или телефону..."
          className="flex-1 px-3.5 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
          className="px-3.5 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Все сегменты</option>
          {Object.entries(SEGMENT_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Загрузка...</div>
        ) : customers.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            Клиенты появятся автоматически при создании заказов
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Клиент</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Сегмент</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Заказов</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">LTV</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Последний заказ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => (window.location.href = `/customers/${c.id}`)}
                >
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-gray-900">{c.name || '—'}</p>
                    <p className="text-xs text-gray-500">{c.phone}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${SEGMENT_COLORS[c.segment]}`}>
                      {SEGMENT_LABELS[c.segment]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-700">
                    {c.profile?.ordersCount ?? 0}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-700">
                    {c.profile?.totalSpent ? `${c.profile.totalSpent} ₽` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-400">
                    {c.profile?.lastOrderAt
                      ? new Date(c.profile.lastOrderAt).toLocaleDateString('ru')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
