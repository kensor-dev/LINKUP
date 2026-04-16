'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface Task {
  id: string
  title: string
  description: string | null
  status: 'OPEN' | 'DONE'
  dueAt: string | null
  doneAt: string | null
  createdAt: string
  customer: { id: string; name: string; phone: string } | null
  assignedTo: { id: string; name: string } | null
  order: { id: string; deliveryAddress: string } | null
}

export default function TasksPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueAt, setDueAt] = useState('')

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: () => api.get('/api/tasks').then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description?: string; dueAt?: string }) =>
      api.post('/api/tasks', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      setShowForm(false)
      setTitle('')
      setDescription('')
      setDueAt('')
    },
  })

  const doneMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/api/tasks/${id}`, { status: 'DONE' }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    createMutation.mutate({
      title,
      description: description || undefined,
      dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
    })
  }

  const open = tasks.filter((t) => t.status === 'OPEN')
  const overdue = open.filter((t) => t.dueAt && new Date(t.dueAt) < new Date())
  const upcoming = open.filter((t) => !t.dueAt || new Date(t.dueAt) >= new Date())
  const done = tasks.filter((t) => t.status === 'DONE')

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  }

  function TaskCard({ task }: { task: Task }) {
    const isOverdue = task.dueAt && new Date(task.dueAt) < new Date() && task.status === 'OPEN'
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium ${task.status === 'DONE' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {task.status === 'OPEN' && (
              <button
                onClick={() => doneMutation.mutate(task.id)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Выполнено
              </button>
            )}
            <button
              onClick={() => deleteMutation.mutate(task.id)}
              className="text-xs text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        </div>

        {task.description && (
          <p className="text-xs text-gray-500">{task.description}</p>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          {task.dueAt && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              isOverdue ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
            }`}>
              {isOverdue ? '⚠ ' : ''}{formatDate(task.dueAt)}
            </span>
          )}
          {task.customer && (
            <span className="text-xs text-gray-400">{task.customer.name}</span>
          )}
          {task.assignedTo && (
            <span className="text-xs text-gray-400">→ {task.assignedTo.name}</span>
          )}
          {task.doneAt && (
            <span className="text-xs text-gray-400">Выполнено {formatDate(task.doneAt)}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Задачи</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Новая задача
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
          <h2 className="font-semibold text-gray-900 mb-4">Новая задача</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Перезвонить клиенту..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Срок (опционально)</label>
              <input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
              >
                {createMutation.isPending ? 'Сохраняем...' : 'Создать'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-gray-400 text-sm py-10">Загрузка...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-700">Просроченные</h2>
              {overdue.length > 0 && (
                <span className="text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">
                  {overdue.length}
                </span>
              )}
            </div>
            {overdue.length === 0 ? (
              <p className="text-xs text-gray-400">Нет просроченных</p>
            ) : (
              overdue.map((t) => <TaskCard key={t.id} task={t} />)
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-700">Открытые</h2>
              {upcoming.length > 0 && (
                <span className="text-xs bg-blue-100 text-blue-600 font-medium px-2 py-0.5 rounded-full">
                  {upcoming.length}
                </span>
              )}
            </div>
            {upcoming.length === 0 ? (
              <p className="text-xs text-gray-400">Нет задач</p>
            ) : (
              upcoming.map((t) => <TaskCard key={t.id} task={t} />)
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Выполненные</h2>
            {done.length === 0 ? (
              <p className="text-xs text-gray-400">Пока нет</p>
            ) : (
              done.slice(0, 20).map((t) => <TaskCard key={t.id} task={t} />)
            )}
          </div>
        </div>
      )}
    </div>
  )
}
