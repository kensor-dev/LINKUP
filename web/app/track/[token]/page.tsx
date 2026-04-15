'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface TrackingData {
  status: string
  deliveryAddress: string
  totalAmount: number | null
  notes: string | null
  assignedAt: string | null
  pickedUpAt: string | null
  deliveredAt: string | null
  courier: { id: string; name: string; photoUrl: string | null } | null
  courierLat: number | null
  courierLng: number | null
  business: { name: string; logoUrl: string | null; brandColor: string }
}

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Заказ принят',
  ASSIGNED: 'Курьер назначен',
  PICKED_UP: 'Курьер забрал заказ',
  IN_TRANSIT: 'Курьер в пути',
  DELIVERED: 'Заказ доставлен',
  FAILED: 'Не удалось доставить',
  CANCELLED: 'Заказ отменён',
}

const STEPS = ['NEW', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED']

function stepIndex(status: string) {
  const idx = STEPS.indexOf(status)
  return idx === -1 ? 0 : idx
}

export default function TrackingPage() {
  const { token } = useParams<{ token: string }>()

  const { data, isLoading, error } = useQuery<TrackingData>({
    queryKey: ['tracking', token],
    queryFn: () => api.get(`/api/tracking/${token}`).then((r) => r.data),
    refetchInterval: 15000,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Загрузка...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-700 font-medium">Ссылка недействительна</p>
          <p className="text-gray-400 text-sm mt-1">Проверьте ссылку или свяжитесь с магазином</p>
        </div>
      </div>
    )
  }

  const currentStep = stepIndex(data.status)
  const isFailed = data.status === 'FAILED' || data.status === 'CANCELLED'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-8 space-y-5">
        <div className="flex items-center gap-3">
          {data.business.logoUrl ? (
            <img
              src={data.business.logoUrl}
              alt={data.business.name}
              className="w-8 h-8 rounded-lg object-contain"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: data.business.brandColor }}
            >
              {data.business.name[0]}
            </div>
          )}
          <span className="text-sm font-medium text-gray-700">{data.business.name}</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <div>
            <p className="text-xs text-gray-400 mb-1">Статус заказа</p>
            <p
              className={`text-lg font-semibold ${
                data.status === 'DELIVERED'
                  ? 'text-green-600'
                  : isFailed
                  ? 'text-red-600'
                  : 'text-gray-900'
              }`}
            >
              {STATUS_LABELS[data.status] ?? data.status}
            </p>
          </div>

          {!isFailed && (
            <div className="space-y-1">
              <div className="flex justify-between mb-2">
                {STEPS.map((step, i) => (
                  <div
                    key={step}
                    className={`flex-1 h-1.5 rounded-full mx-0.5 transition-colors ${
                      i <= currentStep ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Принят</span>
                <span>Назначен</span>
                <span>Забрал</span>
                <span>В пути</span>
                <span>Доставлен</span>
              </div>
            </div>
          )}

          <div>
            <p className="text-xs text-gray-400 mb-1">Адрес доставки</p>
            <p className="text-sm text-gray-800">{data.deliveryAddress}</p>
          </div>

          {data.totalAmount && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Сумма заказа</p>
              <p className="text-sm font-medium text-gray-900">
                {data.totalAmount.toLocaleString('ru')} ₽
              </p>
            </div>
          )}

          {data.notes && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Примечание</p>
              <p className="text-sm text-gray-700">{data.notes}</p>
            </div>
          )}
        </div>

        {data.courier && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
            {data.courier.photoUrl ? (
              <img
                src={data.courier.photoUrl}
                alt={data.courier.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-lg">
                {data.courier.name[0]}
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400">Ваш курьер</p>
              <p className="text-sm font-semibold text-gray-900">{data.courier.name}</p>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400">
          Страница обновляется автоматически каждые 15 секунд
        </p>
      </div>
    </div>
  )
}
