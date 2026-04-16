'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'

interface Courier {
  id: string
  name: string
  phone: string
  photoUrl: string | null
  isActive: boolean
  isOnline: boolean
  createdAt: string
}

export default function CouriersPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [formError, setFormError] = useState('')

  const { data: couriers = [], isLoading } = useQuery<Courier[]>({
    queryKey: ['couriers'],
    queryFn: () => api.get('/api/couriers').then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; phone: string }) =>
      api.post('/api/couriers', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['couriers'] })
      setShowForm(false)
      setName('')
      setPhone('')
      setFormError('')
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Ошибка при создании'
      setFormError(msg)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/couriers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['couriers'] }),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    createMutation.mutate({ name, phone })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Курьеры</h1>
        <div className="flex gap-2">
          <Link
            href="/couriers/shifts"
            className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Расписание
          </Link>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Добавить курьера
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-md">
          <h2 className="font-semibold text-gray-900 mb-4">Новый курьер</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">
                {formError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Иван Петров"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+79991234567"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {createMutation.isPending ? 'Сохраняем...' : 'Сохранить'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormError('') }}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Загрузка...</div>
        ) : couriers.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Курьеров пока нет</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Имя</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Телефон</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Статус</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {couriers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{c.name}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{c.phone}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                        c.isOnline
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${c.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}
                      />
                      {c.isOnline ? 'Онлайн' : 'Офлайн'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => deleteMutation.mutate(c.id)}
                      className="text-xs text-red-500 hover:text-red-700 transition-colors"
                    >
                      Деактивировать
                    </button>
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
