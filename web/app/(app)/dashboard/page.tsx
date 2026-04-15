'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'

interface LiveCourier {
  courierId: string
  name: string
  isOnline: boolean
  lat: number | null
  lng: number | null
}

interface Order {
  id: string
  status: string
  customer: { name: string | null; phone: string }
  courier: { name: string } | null
  deliveryAddress: string
  createdAt: string
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

export default function DashboardPage() {
  const { loadFromStorage } = useAuthStore()

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  const { data: couriers = [] } = useQuery<LiveCourier[]>({
    queryKey: ['couriers-live'],
    queryFn: () => api.get('/api/couriers/live').then((r) => r.data),
    refetchInterval: 5000,
  })

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['orders-today'],
    queryFn: () =>
      api
        .get('/api/orders', {
          params: { date: new Date().toISOString().split('T')[0] },
        })
        .then((r) => r.data),
    refetchInterval: 10000,
  })

  const onlineCouriers = couriers.filter((c) => c.isOnline)
  const activeOrders = orders.filter((o) =>
    ['NEW', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(o.status)
  )
  const deliveredToday = orders.filter((o) => o.status === 'DELIVERED')

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Дашборд</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Заказов сегодня</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{orders.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">В доставке</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">{activeOrders.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Выполнено</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{deliveredToday.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Заказы сегодня</h2>
            <a href="/orders/new" className="text-sm text-blue-600 hover:underline">
              + Новый заказ
            </a>
          </div>
          {orders.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-400 text-sm">
              Заказов пока нет
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {orders.slice(0, 10).map((order) => (
                <a
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {order.customer.name || order.customer.phone}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {order.deliveryAddress}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center gap-3">
                    {order.courier && (
                      <span className="text-xs text-gray-500">{order.courier.name}</span>
                    )}
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status]}`}
                    >
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">
              Курьеры{' '}
              <span className="text-sm font-normal text-green-600">
                {onlineCouriers.length} онлайн
              </span>
            </h2>
          </div>
          {couriers.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-400 text-sm">
              Нет курьеров
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {couriers.map((courier) => (
                <div key={courier.courierId} className="flex items-center px-5 py-3.5 gap-3">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      courier.isOnline ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                  <span className="text-sm text-gray-800 flex-1 truncate">{courier.name}</span>
                  <span className="text-xs text-gray-400">
                    {courier.isOnline ? 'онлайн' : 'офлайн'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
