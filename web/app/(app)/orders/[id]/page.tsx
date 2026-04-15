'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface OrderDetail {
  id: string
  status: string
  trackingToken: string
  deliveryAddress: string
  totalAmount: number | null
  notes: string | null
  createdAt: string
  assignedAt: string | null
  pickedUpAt: string | null
  deliveredAt: string | null
  customer: { id: string; name: string | null; phone: string }
  courier: { id: string; name: string; phone: string } | null
  statusHistory: { id: string; status: string; comment: string | null; changedAt: string }[]
}

interface Courier {
  id: string
  name: string
}

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Новый',
  ASSIGNED: 'Назначен',
  PICKED_UP: 'Забрал товар',
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

const NEXT_STATUSES: Record<string, string[]> = {
  NEW: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'FAILED'],
  DELIVERED: [],
  FAILED: [],
  CANCELLED: [],
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const { data: order, isLoading } = useQuery<OrderDetail>({
    queryKey: ['order', id],
    queryFn: () => api.get(`/api/orders/${id}`).then((r) => r.data),
  })

  const { data: couriers = [] } = useQuery<Courier[]>({
    queryKey: ['couriers'],
    queryFn: () => api.get('/api/couriers').then((r) => r.data),
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      api.patch(`/api/orders/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['order', id] }),
  })

  const assignMutation = useMutation({
    mutationFn: (courierId: string) =>
      api.patch(`/api/orders/${id}/assign`, { courierId }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['order', id] }),
  })

  function copyTrackingLink() {
    if (!order) return
    navigator.clipboard.writeText(`${window.location.origin}/track/${order.trackingToken}`)
    alert('Ссылка скопирована!')
  }

  if (isLoading) {
    return <div className="p-6 text-gray-400 text-sm">Загрузка...</div>
  }
  if (!order) {
    return <div className="p-6 text-gray-400 text-sm">Заказ не найден</div>
  }

  const nextStatuses = NEXT_STATUSES[order.status] ?? []

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">
          ← Назад
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">Заказ</h1>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-900 text-sm">Клиент</h2>
          <div>
            <p className="text-sm font-medium text-gray-900">{order.customer.name || '—'}</p>
            <p className="text-sm text-gray-500">{order.customer.phone}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Адрес доставки</p>
            <p className="text-sm text-gray-800">{order.deliveryAddress}</p>
          </div>
          {order.notes && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Примечание</p>
              <p className="text-sm text-gray-800">{order.notes}</p>
            </div>
          )}
          {order.totalAmount && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Сумма</p>
              <p className="text-sm font-medium text-gray-900">{order.totalAmount} ₽</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-900 text-sm">Курьер</h2>
          {order.courier ? (
            <div>
              <p className="text-sm font-medium text-gray-900">{order.courier.name}</p>
              <p className="text-sm text-gray-500">{order.courier.phone}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Не назначен</p>
          )}

          {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Переназначить</p>
              <select
                defaultValue=""
                onChange={(e) => e.target.value && assignMutation.mutate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Выбрать курьера...</option>
                {couriers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={copyTrackingLink}
            className="w-full text-sm text-blue-600 border border-blue-200 hover:bg-blue-50 py-2 rounded-lg transition-colors"
          >
            Скопировать ссылку для клиента
          </button>
        </div>
      </div>

      {nextStatuses.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-3">Изменить статус</h2>
          <div className="flex gap-2 flex-wrap">
            {nextStatuses.map((s) => (
              <button
                key={s}
                onClick={() => statusMutation.mutate(s)}
                disabled={statusMutation.isPending}
                className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                  s === 'CANCELLED' || s === 'FAILED'
                    ? 'bg-red-50 text-red-700 hover:bg-red-100'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 text-sm mb-4">История статусов</h2>
        <div className="space-y-3">
          {order.statusHistory.map((h) => (
            <div key={h.id} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">{STATUS_LABELS[h.status] ?? h.status}</p>
                {h.comment && <p className="text-xs text-gray-500">{h.comment}</p>}
                <p className="text-xs text-gray-400">{new Date(h.changedAt).toLocaleString('ru')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
