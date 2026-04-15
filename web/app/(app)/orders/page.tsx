'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'

interface Order {
  id: string
  status: string
  deliveryAddress: string
  totalAmount: number | null
  createdAt: string
  customer: { name: string | null; phone: string }
  courier: { name: string } | null
}

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Новый',
  ASSIGNED: 'Назначен',
  PICKED_UP: 'Забрал',
  IN_TRANSIT: 'В пути',
  DELIVERED: 'Доставлен',
  FAILED: 'Не застал',
  CANCELLED: 'Отменён',
}

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-gray-100 text-gray-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  PICKED_UP: 'bg-yellow-100 text-yellow-700',
  IN_TRANSIT: 'bg-orange-100 text-orange-700',
  DELIVERED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

export default function OrdersPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['orders', status, search],
    queryFn: () =>
      api.get('/api/orders', { params: { status: status || undefined, search: search || undefined } })
        .then((r) => r.data),
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Заказы</h1>
        <Link
          href="/orders/new"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Новый заказ
        </Link>
      </div>

      <div className="flex gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по телефону или номеру заказа..."
          className="flex-1 px-3.5 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3.5 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Все статусы</option>
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Загрузка...</div>
        ) : orders.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Заказов не найдено</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Клиент</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Адрес</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Курьер</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Сумма</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Статус</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => (window.location.href = `/orders/${order.id}`)}
                >
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-gray-900">
                      {order.customer.name || '—'}
                    </p>
                    <p className="text-xs text-gray-500">{order.customer.phone}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600 max-w-[220px] truncate">
                    {order.deliveryAddress}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">
                    {order.courier?.name ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-900">
                    {order.totalAmount ? `${order.totalAmount} ₽` : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-400">
                    {new Date(order.createdAt).toLocaleString('ru')}
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
