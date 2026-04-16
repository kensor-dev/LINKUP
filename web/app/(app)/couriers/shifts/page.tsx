'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface Courier {
  id: string
  name: string
  phone: string
}

interface Shift {
  id: string
  courierId: string
  date: string
  startsAt: string
  endsAt: string
  courier: { id: string; name: string }
}

function getWeekStart(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toDateStr(date: Date) {
  return date.toISOString().slice(0, 10)
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export default function ShiftsPage() {
  const qc = useQueryClient()
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [adding, setAdding] = useState<{ courierId: string; date: string } | null>(null)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('21:00')

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekParam = toDateStr(weekStart)

  const { data: couriers = [] } = useQuery<Courier[]>({
    queryKey: ['couriers'],
    queryFn: () => api.get('/api/couriers').then((r) => r.data),
  })

  const { data: shifts = [] } = useQuery<Shift[]>({
    queryKey: ['shifts', weekParam],
    queryFn: () => api.get(`/api/shifts?week=${weekParam}`).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: { courierId: string; date: string; startsAt: string; endsAt: string }) =>
      api.post('/api/shifts', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts', weekParam] })
      setAdding(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/shifts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts', weekParam] }),
  })

  function getShiftsForCell(courierId: string, date: Date) {
    const dateStr = toDateStr(date)
    return shifts.filter(
      (s) => s.courierId === courierId && s.date.slice(0, 10) === dateStr
    )
  }

  function handleAddShift() {
    if (!adding) return
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const base = new Date(adding.date)

    const startsAt = new Date(base)
    startsAt.setHours(sh, sm, 0, 0)

    const endsAt = new Date(base)
    endsAt.setHours(eh, em, 0, 0)

    createMutation.mutate({
      courierId: adding.courierId,
      date: adding.date,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    })
  }

  const activeCouriers = couriers.filter((c) => (c as unknown as { isActive?: boolean }).isActive !== false)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Расписание смен</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
          >
            ←
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[160px] text-center">
            {weekStart.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} —{' '}
            {addDays(weekStart, 6).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
          </span>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
          >
            →
          </button>
          <button
            onClick={() => setWeekStart(getWeekStart(new Date()))}
            className="ml-2 text-xs text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50"
          >
            Сегодня
          </button>
        </div>
      </div>

      {activeCouriers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-400">
          Нет активных курьеров. Сначала добавьте курьеров.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 w-36">Курьер</th>
                {weekDays.map((day, i) => {
                  const isToday = toDateStr(day) === toDateStr(new Date())
                  return (
                    <th key={i} className={`text-center text-xs font-medium px-2 py-3 ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                      <div>{DAY_NAMES[i]}</div>
                      <div className={`text-base font-semibold mt-0.5 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                        {day.getDate()}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeCouriers.map((courier) => (
                <tr key={courier.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">{courier.name}</p>
                    <p className="text-xs text-gray-400 truncate">{courier.phone}</p>
                  </td>
                  {weekDays.map((day, di) => {
                    const cellShifts = getShiftsForCell(courier.id, day)
                    const dateStr = toDateStr(day)
                    const isAdding = adding?.courierId === courier.id && adding?.date === dateStr

                    return (
                      <td key={di} className="px-2 py-2 text-center align-top min-w-[90px]">
                        <div className="space-y-1">
                          {cellShifts.map((s) => (
                            <div
                              key={s.id}
                              className="group relative bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 text-xs text-blue-700"
                            >
                              <div className="font-medium">{formatTime(s.startsAt)}–{formatTime(s.endsAt)}</div>
                              <button
                                onClick={() => deleteMutation.mutate(s.id)}
                                className="absolute -top-1 -right-1 hidden group-hover:flex w-4 h-4 items-center justify-center bg-red-500 text-white rounded-full text-[10px] leading-none"
                              >
                                ×
                              </button>
                            </div>
                          ))}

                          {isAdding ? (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 space-y-1.5 text-left">
                              <div className="flex gap-1 items-center">
                                <input
                                  type="time"
                                  value={startTime}
                                  onChange={(e) => setStartTime(e.target.value)}
                                  className="w-[72px] px-1 py-0.5 border border-gray-300 rounded text-xs bg-white"
                                />
                                <span className="text-gray-400 text-xs">—</span>
                                <input
                                  type="time"
                                  value={endTime}
                                  onChange={(e) => setEndTime(e.target.value)}
                                  className="w-[72px] px-1 py-0.5 border border-gray-300 rounded text-xs bg-white"
                                />
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={handleAddShift}
                                  disabled={createMutation.isPending}
                                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[10px] font-medium py-1 rounded"
                                >
                                  ОК
                                </button>
                                <button
                                  onClick={() => setAdding(null)}
                                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] py-1 rounded"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAdding({ courierId: courier.id, date: dateStr })}
                              className="w-full h-7 flex items-center justify-center text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg border border-dashed border-gray-200 hover:border-blue-300 transition-colors text-lg"
                            >
                              +
                            </button>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
