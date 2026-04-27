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

type ColumnId = 'overdue' | 'open' | 'done'

const COLUMN_STATUS: Record<ColumnId, 'OPEN' | 'DONE'> = {
  overdue: 'OPEN',
  open: 'OPEN',
  done: 'DONE',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function TaskCard({
  task,
  onDragStart,
  onDelete,
}: {
  task: Task
  onDragStart: (id: string) => void
  onDelete: (id: string) => void
}) {
  const isOverdue = task.dueAt && new Date(task.dueAt) < new Date() && task.status === 'OPEN'

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(task.id)
      }}
      className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 cursor-grab active:cursor-grabbing active:opacity-50 active:scale-95 transition-all select-none shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-medium ${task.status === 'DONE' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
          {task.title}
        </p>
        <button
          onClick={() => onDelete(task.id)}
          className="text-xs text-slate-300 hover:text-red-400 transition-colors shrink-0 mt-0.5"
        >
          ✕
        </button>
      </div>

      {task.description && (
        <p className="text-xs text-slate-500">{task.description}</p>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        {task.dueAt && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            isOverdue ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
          }`}>
            {isOverdue ? '⚠ ' : ''}{formatDate(task.dueAt)}
          </span>
        )}
        {task.customer && (
          <span className="text-xs text-slate-400">{task.customer.name}</span>
        )}
        {task.assignedTo && (
          <span className="text-xs text-slate-400">→ {task.assignedTo.name}</span>
        )}
        {task.doneAt && (
          <span className="text-xs text-slate-400">Выполнено {formatDate(task.doneAt)}</span>
        )}
      </div>
    </div>
  )
}

function Column({
  id,
  label,
  tasks,
  count,
  badgeClass,
  emptyText,
  draggingId,
  onDragStart,
  onDrop,
  onDelete,
}: {
  id: ColumnId
  label: string
  tasks: Task[]
  count: number
  badgeClass: string
  emptyText: string
  draggingId: string | null
  onDragStart: (taskId: string) => void
  onDrop: (col: ColumnId) => void
  onDelete: (id: string) => void
}) {
  const [isOver, setIsOver] = useState(false)

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsOver(true) }}
      onDragLeave={() => setIsOver(false)}
      onDrop={() => { setIsOver(false); onDrop(id) }}
      className={`flex flex-col gap-3 min-h-[200px] rounded-2xl p-3 transition-colors ${
        isOver && draggingId
          ? 'bg-blue-50 ring-2 ring-blue-300 ring-inset'
          : 'bg-slate-100/60'
      }`}
    >
      <div className="flex items-center gap-2 px-1 py-1">
        <h2 className="text-sm font-semibold text-slate-700">{label}</h2>
        {count > 0 && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>
            {count}
          </span>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className={`flex-1 flex items-center justify-center rounded-xl border-2 border-dashed text-xs transition-colors ${
          isOver && draggingId
            ? 'border-blue-300 text-blue-400'
            : 'border-slate-200 text-slate-400'
        }`}>
          {isOver && draggingId ? 'Отпустите сюда' : emptyText}
        </div>
      ) : (
        tasks.map((t) => (
          <TaskCard key={t.id} task={t} onDragStart={onDragStart} onDelete={onDelete} />
        ))
      )}

      {tasks.length > 0 && isOver && draggingId && (
        <div className="h-12 rounded-xl border-2 border-dashed border-blue-300 flex items-center justify-center text-xs text-blue-400">
          Отпустите сюда
        </div>
      )}
    </div>
  )
}

export default function TasksPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [draggingId, setDraggingId] = useState<string | null>(null)

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

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'OPEN' | 'DONE' }) =>
      api.patch(`/api/tasks/${id}`, { status }).then((r) => r.data),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] })
      const prev = qc.getQueryData<Task[]>(['tasks'])
      qc.setQueryData<Task[]>(['tasks'], (old = []) =>
        old.map((t) =>
          t.id === id
            ? { ...t, status, doneAt: status === 'DONE' ? new Date().toISOString() : null }
            : t
        )
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['tasks'], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  function handleDrop(col: ColumnId) {
    if (!draggingId) return
    const task = tasks.find((t) => t.id === draggingId)
    if (!task) return
    const newStatus = COLUMN_STATUS[col]
    if (task.status !== newStatus || (col === 'done' && task.status === 'DONE') || (col !== 'done' && task.status === 'OPEN')) {
      if (task.status !== newStatus) {
        updateMutation.mutate({ id: draggingId, status: newStatus })
      }
    }
    setDraggingId(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    createMutation.mutate({
      title,
      description: description || undefined,
      dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
    })
  }

  const now = new Date()
  const open = tasks.filter((t) => t.status === 'OPEN')
  const overdue = open.filter((t) => t.dueAt && new Date(t.dueAt) < now)
  const upcoming = open.filter((t) => !t.dueAt || new Date(t.dueAt) >= now)
  const done = tasks.filter((t) => t.status === 'DONE')

  return (
    <div className="p-6 space-y-6" onDragEnd={() => setDraggingId(null)}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Задачи</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Новая задача
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-lg shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4">Новая задача</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Название</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                placeholder="Перезвонить клиенту..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Описание</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Срок (опционально)</label>
              <input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
              >
                {createMutation.isPending ? 'Сохраняем...' : 'Создать'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-100"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-slate-400 text-sm py-10">Загрузка...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Column
            id="open"
            label="Открытые"
            tasks={upcoming}
            count={upcoming.length}
            badgeClass="bg-blue-100 text-blue-600"
            emptyText="Нет задач"
            draggingId={draggingId}
            onDragStart={setDraggingId}
            onDrop={handleDrop}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
          <Column
            id="done"
            label="Выполненные"
            tasks={done.slice(0, 20)}
            count={done.length}
            badgeClass="bg-green-100 text-green-700"
            emptyText="Пока нет"
            draggingId={draggingId}
            onDragStart={setDraggingId}
            onDrop={handleDrop}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
          <Column
            id="overdue"
            label="Просроченные"
            tasks={overdue}
            count={overdue.length}
            badgeClass="bg-red-100 text-red-600"
            emptyText="Нет просроченных"
            draggingId={draggingId}
            onDragStart={setDraggingId}
            onDrop={handleDrop}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        </div>
      )}
    </div>
  )
}
