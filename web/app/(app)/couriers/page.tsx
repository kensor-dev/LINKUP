'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api'

const CourierMap = dynamic(() => import('./CourierMap'), { ssr: false })

interface Courier {
  id: string
  name: string
  phone: string
  photoUrl: string | null
  isActive: boolean
  isOnline: boolean
  createdAt: string
}

interface LiveCourier {
  courierId: string
  name: string
  isOnline: boolean
  lat: number | null
  lng: number | null
}

export default function CouriersPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'list' | 'map'>('list')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [formError, setFormError] = useState('')

  const { data: couriers = [], isLoading } = useQuery<Courier[]>({
    queryKey: ['couriers'],
    queryFn: () => api.get('/api/couriers').then((r) => r.data),
  })

  const { data: liveCouriers = [] } = useQuery<LiveCourier[]>({
    queryKey: ['couriers-live'],
    queryFn: () => api.get('/api/couriers/live').then((r) => r.data),
    refetchInterval: tab === 'map' ? 5000 : false,
    enabled: tab === 'map',
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
        <h1 className="text-2xl font-semibold text-slate-900">Курьеры</h1>
        <div className="flex gap-2">
          <Link
            href="/couriers/shifts"
            className="border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Расписание
          </Link>
          <button
            onClick={() => setShowForm(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Добавить курьера
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-200 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('list')}
          className={`text-sm px-4 py-1.5 rounded-md font-medium transition-colors ${
            tab === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Список
        </button>
        <button
          onClick={() => setTab('map')}
          className={`text-sm px-4 py-1.5 rounded-md font-medium transition-colors ${
            tab === 'map' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          На карте
        </button>
      </div>

      {tab === 'map' ? (
        <CourierMap couriers={liveCouriers} />
      ) : (
        <>
          {showForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-md shadow-sm">
              <h2 className="font-semibold text-slate-900 mb-4">Новый курьер</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {formError && (
                  <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-100">
                    {formError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Имя</label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                    placeholder="Иван Петров"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Телефон</label>
                  <input
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                    placeholder="+79991234567"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    {createMutation.isPending ? 'Сохраняем...' : 'Сохранить'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setFormError('') }}
                    className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200">
            {isLoading ? (
              <div className="p-10 text-center text-slate-400 text-sm">Загрузка...</div>
            ) : couriers.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">Курьеров пока нет</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Имя</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Телефон</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Статус</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {couriers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5 text-sm font-medium text-slate-900">{c.name}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">{c.phone}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                          c.isOnline ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${c.isOnline ? 'bg-green-500' : 'bg-slate-400'}`} />
                          {c.isOnline ? 'Онлайн' : 'Офлайн'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => deleteMutation.mutate(c.id)}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors"
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
        </>
      )}
    </div>
  )
}
