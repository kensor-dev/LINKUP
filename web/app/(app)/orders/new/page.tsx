'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface Courier {
  id: string
  name: string
  isOnline: boolean
}

export default function NewOrderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [phone, setPhone] = useState(searchParams.get('phone') ?? '')
  const [customerName, setCustomerName] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [courierId, setCourierId] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [error, setError] = useState('')

  const { data: couriers = [] } = useQuery<Courier[]>({
    queryKey: ['couriers'],
    queryFn: () => api.get('/api/couriers').then((r) => r.data),
  })

  const mutation = useMutation({
    mutationFn: (data: object) => api.post('/api/orders', data).then((r) => r.data),
    onSuccess: (order) => router.push(`/orders/${order.id}`),
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Ошибка при создании заказа'
      setError(msg)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    mutation.mutate({
      customerPhone: phone,
      customerName: customerName || undefined,
      address,
      notes: notes || undefined,
      courierId: courierId || undefined,
      totalAmount: totalAmount ? parseFloat(totalAmount) : undefined,
    })
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Назад
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">Новый заказ</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Телефон клиента <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+79991234567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Имя клиента</label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Иван Иванов"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Адрес доставки <span className="text-red-500">*</span>
          </label>
          <input
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ул. Пушкина, д. 10, кв. 5"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Курьер</label>
            <select
              value={courierId}
              onChange={(e) => setCourierId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Не назначен</option>
              {couriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.isOnline ? '🟢' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Сумма заказа</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Примечание</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Домофон 123, позвонить за 10 минут..."
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            {mutation.isPending ? 'Создаём...' : 'Создать заказ'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  )
}
