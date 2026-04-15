'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'

interface CustomerDetail {
  id: string
  name: string | null
  phone: string
  email: string | null
  notes: string | null
  tags: string[]
  segment: string
  createdAt: string
  profile: {
    ordersCount: number
    totalSpent: number
    avgCheck: number
    firstOrderAt: string | null
    lastOrderAt: string | null
  } | null
  orders: {
    id: string
    status: string
    deliveryAddress: string
    totalAmount: number | null
    createdAt: string
    courier: { name: string } | null
  }[]
  tasks: {
    id: string
    title: string
    dueAt: string | null
    createdAt: string
  }[]
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

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')

  const { data: customer, isLoading } = useQuery<CustomerDetail>({
    queryKey: ['customer', id],
    queryFn: () => api.get(`/api/customers/${id}`).then((r) => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; email?: string; notes?: string }) =>
      api.patch(`/api/customers/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', id] })
      setEditing(false)
    },
  })

  function startEdit() {
    if (!customer) return
    setName(customer.name ?? '')
    setEmail(customer.email ?? '')
    setNotes(customer.notes ?? '')
    setEditing(true)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    updateMutation.mutate({
      name: name || undefined,
      email: email || undefined,
      notes: notes || undefined,
    })
  }

  if (isLoading) return <div className="p-6 text-gray-400 text-sm">Загрузка...</div>
  if (!customer) return <div className="p-6 text-gray-400 text-sm">Клиент не найден</div>

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">
          ← Назад
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">
          {customer.name || customer.phone}
        </h1>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${SEGMENT_COLORS[customer.segment]}`}>
          {SEGMENT_LABELS[customer.segment]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">Данные клиента</h2>
            {!editing && (
              <button
                onClick={startEdit}
                className="text-xs text-blue-600 hover:underline"
              >
                Изменить
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Имя</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Заметки</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  {updateMutation.isPending ? 'Сохраняем...' : 'Сохранить'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Отмена
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2.5">
              <div>
                <p className="text-xs text-gray-400">Телефон</p>
                <p className="text-sm text-gray-900">{customer.phone}</p>
              </div>
              {customer.email && (
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="text-sm text-gray-900">{customer.email}</p>
                </div>
              )}
              {customer.notes && (
                <div>
                  <p className="text-xs text-gray-400">Заметки</p>
                  <p className="text-sm text-gray-800">{customer.notes}</p>
                </div>
              )}
              {customer.tags.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Теги</p>
                  <div className="flex flex-wrap gap-1">
                    {customer.tags.map((t) => (
                      <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400">Клиент с</p>
                <p className="text-sm text-gray-700">
                  {new Date(customer.createdAt).toLocaleDateString('ru')}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">Статистика</h2>
          {customer.profile ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Заказов</span>
                <span className="text-sm font-semibold text-gray-900">
                  {customer.profile.ordersCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">LTV</span>
                <span className="text-sm font-semibold text-gray-900">
                  {customer.profile.totalSpent.toLocaleString('ru')} ₽
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Средний чек</span>
                <span className="text-sm font-semibold text-gray-900">
                  {customer.profile.avgCheck.toLocaleString('ru')} ₽
                </span>
              </div>
              {customer.profile.firstOrderAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Первый заказ</span>
                  <span className="text-sm text-gray-700">
                    {new Date(customer.profile.firstOrderAt).toLocaleDateString('ru')}
                  </span>
                </div>
              )}
              {customer.profile.lastOrderAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Последний заказ</span>
                  <span className="text-sm text-gray-700">
                    {new Date(customer.profile.lastOrderAt).toLocaleDateString('ru')}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Нет данных</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">История заказов</h2>
          <a
            href={`/orders/new?phone=${customer.phone}`}
            className="text-sm text-blue-600 hover:underline"
          >
            + Новый заказ
          </a>
        </div>
        {customer.orders.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">Заказов нет</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Адрес</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Курьер</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Сумма</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Статус</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customer.orders.map((o) => (
                <tr
                  key={o.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/orders/${o.id}`)}
                >
                  <td className="px-5 py-3.5 text-sm text-gray-700 max-w-[200px] truncate">
                    {o.deliveryAddress}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">
                    {o.courier?.name ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-900">
                    {o.totalAmount ? `${o.totalAmount} ₽` : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[o.status]}`}>
                      {STATUS_LABELS[o.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-400">
                    {new Date(o.createdAt).toLocaleDateString('ru')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {customer.tasks.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Открытые задачи</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {customer.tasks.map((t) => (
              <div key={t.id} className="px-5 py-3.5">
                <p className="text-sm font-medium text-gray-900">{t.title}</p>
                {t.dueAt && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    До {new Date(t.dueAt).toLocaleDateString('ru')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
