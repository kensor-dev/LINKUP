'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface Action {
  type: 'create_task' | 'send_sms' | 'send_whatsapp' | 'add_tag'
  params: Record<string, unknown>
}

interface Scenario {
  id: string
  name: string
  triggerType: string
  triggerParams: Record<string, unknown>
  actions: Action[]
  isActive: boolean
  runsCount: number
  createdAt: string
}

const TRIGGER_LABELS: Record<string, string> = {
  courier_late: 'Курьер опоздал',
  order_failed: 'Заказ не доставлен',
  no_order_days: 'Нет заказов N дней',
  first_order: 'Первый заказ',
  nth_order: 'N-й заказ клиента',
  ltv_threshold: 'LTV достиг порога',
}

const ACTION_LABELS: Record<string, string> = {
  create_task: 'Создать задачу',
  send_sms: 'Отправить SMS',
  send_whatsapp: 'Отправить WhatsApp',
  add_tag: 'Добавить тег',
}

const TEMPLATES = [
  {
    name: 'Курьер опоздал → промокод',
    triggerType: 'courier_late',
    triggerParams: { minutes: 30 },
    actions: [
      {
        type: 'send_whatsapp' as const,
        params: { text: 'Привет, {{name}}! Извините за задержку. Дарим промокод -10% на следующий заказ.' },
      },
    ],
  },
  {
    name: 'Реактивация спящего клиента',
    triggerType: 'no_order_days',
    triggerParams: { days: 30 },
    actions: [
      {
        type: 'create_task' as const,
        params: { title: 'Позвонить клиенту {{name}} — не заказывал 30 дней' },
      },
      {
        type: 'send_sms' as const,
        params: { text: 'Привет, {{name}}! Скучаем по вам. Скидка 15% на следующий заказ.' },
      },
    ],
  },
  {
    name: 'Приветствие нового клиента',
    triggerType: 'first_order',
    triggerParams: {},
    actions: [
      {
        type: 'send_whatsapp' as const,
        params: { text: 'Привет, {{name}}! Спасибо за первый заказ. Будем рады видеть вас снова!' },
      },
    ],
  },
  {
    name: 'VIP порог достигнут',
    triggerType: 'ltv_threshold',
    triggerParams: { amount: 10000 },
    actions: [
      {
        type: 'create_task' as const,
        params: { title: 'Поблагодарить VIP клиента {{name}}' },
      },
      { type: 'add_tag' as const, params: { tag: 'vip' } },
    ],
  },
]

export default function ScenariosPage() {
  const qc = useQueryClient()
  const [mode, setMode] = useState<'list' | 'create'>('list')
  const [form, setForm] = useState<{
    name: string
    triggerType: string
    triggerParams: Record<string, unknown>
    actions: Action[]
  } | null>(null)

  const { data: scenarios = [], isLoading } = useQuery<Scenario[]>({
    queryKey: ['scenarios'],
    queryFn: () => api.get('/api/scenarios').then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/api/scenarios', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scenarios'] })
      setMode('list')
      setForm(null)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/api/scenarios/${id}`, { isActive }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scenarios'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/scenarios/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scenarios'] }),
  })

  function openTemplate(tpl: typeof TEMPLATES[number]) {
    setForm({
      name: tpl.name,
      triggerType: tpl.triggerType,
      triggerParams: tpl.triggerParams,
      actions: tpl.actions,
    })
    setMode('create')
  }

  function openBlank() {
    setForm({
      name: '',
      triggerType: 'no_order_days',
      triggerParams: { days: 30 },
      actions: [{ type: 'create_task', params: { title: '' } }],
    })
    setMode('create')
  }

  function describeScenario(s: Scenario) {
    const trigger = TRIGGER_LABELS[s.triggerType] ?? s.triggerType
    const params = s.triggerParams
    let triggerDesc = trigger
    if (s.triggerType === 'courier_late') triggerDesc += ` (>${params.minutes} мин)`
    if (s.triggerType === 'no_order_days') triggerDesc += ` (${params.days} дн.)`
    if (s.triggerType === 'nth_order') triggerDesc += ` (${params.count}-й)`
    if (s.triggerType === 'ltv_threshold') triggerDesc += ` (>${params.amount} ₽)`
    const actionsDesc = s.actions.map((a) => ACTION_LABELS[a.type]).join(', ')
    return `ЕСЛИ ${triggerDesc} → ${actionsDesc}`
  }

  if (mode === 'create' && form) {
    return (
      <div className="p-6 max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setMode('list'); setForm(null) }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Назад
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Новый сценарий</h1>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Триггер</label>
            <select
              value={form.triggerType}
              onChange={(e) => {
                const t = e.target.value
                const defaults: Record<string, Record<string, unknown>> = {
                  courier_late: { minutes: 30 },
                  no_order_days: { days: 30 },
                  nth_order: { count: 5 },
                  ltv_threshold: { amount: 10000 },
                  first_order: {},
                  order_failed: {},
                }
                setForm({ ...form, triggerType: t, triggerParams: defaults[t] ?? {} })
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(TRIGGER_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {form.triggerType === 'courier_late' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Опоздание более (минут)</label>
              <input
                type="number"
                value={Number(form.triggerParams.minutes ?? 30)}
                onChange={(e) => setForm({ ...form, triggerParams: { minutes: Number(e.target.value) } })}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          {form.triggerType === 'no_order_days' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Не заказывал более (дней)</label>
              <input
                type="number"
                value={Number(form.triggerParams.days ?? 30)}
                onChange={(e) => setForm({ ...form, triggerParams: { days: Number(e.target.value) } })}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          {form.triggerType === 'nth_order' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Номер заказа</label>
              <input
                type="number"
                value={Number(form.triggerParams.count ?? 5)}
                onChange={(e) => setForm({ ...form, triggerParams: { count: Number(e.target.value) } })}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          {form.triggerType === 'ltv_threshold' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Сумма LTV (₽)</label>
              <input
                type="number"
                value={Number(form.triggerParams.amount ?? 10000)}
                onChange={(e) => setForm({ ...form, triggerParams: { amount: Number(e.target.value) } })}
                className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Действия</label>
            <div className="space-y-3">
              {form.actions.map((action, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <select
                      value={action.type}
                      onChange={(e) => {
                        const newActions = [...form.actions]
                        newActions[i] = { type: e.target.value as Action['type'], params: {} }
                        setForm({ ...form, actions: newActions })
                      }}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.entries(ACTION_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    {form.actions.length > 1 && (
                      <button
                        onClick={() => setForm({ ...form, actions: form.actions.filter((_, j) => j !== i) })}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Удалить
                      </button>
                    )}
                  </div>

                  {(action.type === 'send_sms' || action.type === 'send_whatsapp') && (
                    <textarea
                      placeholder="Текст сообщения. Используйте {{name}}, {{phone}}"
                      value={String(action.params.text ?? '')}
                      onChange={(e) => {
                        const newActions = [...form.actions]
                        newActions[i] = { ...action, params: { text: e.target.value } }
                        setForm({ ...form, actions: newActions })
                      }}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  )}
                  {action.type === 'create_task' && (
                    <input
                      placeholder="Название задачи. Используйте {{name}}"
                      value={String(action.params.title ?? '')}
                      onChange={(e) => {
                        const newActions = [...form.actions]
                        newActions[i] = { ...action, params: { title: e.target.value } }
                        setForm({ ...form, actions: newActions })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  {action.type === 'add_tag' && (
                    <input
                      placeholder="Название тега (например: vip)"
                      value={String(action.params.tag ?? '')}
                      onChange={(e) => {
                        const newActions = [...form.actions]
                        newActions[i] = { ...action, params: { tag: e.target.value } }
                        setForm({ ...form, actions: newActions })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setForm({ ...form, actions: [...form.actions, { type: 'create_task', params: { title: '' } }] })}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + Добавить действие
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending || !form.name}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg"
            >
              {createMutation.isPending ? 'Сохраняем...' : 'Создать сценарий'}
            </button>
            <button
              onClick={() => { setMode('list'); setForm(null) }}
              className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Автосценарии</h1>
        <button
          onClick={openBlank}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Создать сценарий
        </button>
      </div>

      {scenarios.length === 0 && !isLoading && (
        <div>
          <p className="text-sm text-gray-500 mb-4">Начните с готового шаблона:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.name}
                onClick={() => openTemplate(tpl)}
                className="text-left bg-white border border-gray-200 hover:border-blue-300 hover:shadow-sm rounded-xl p-5 transition-all"
              >
                <p className="text-sm font-semibold text-gray-900 mb-1">{tpl.name}</p>
                <p className="text-xs text-gray-500">
                  ЕСЛИ {TRIGGER_LABELS[tpl.triggerType]} → {tpl.actions.map((a) => ACTION_LABELS[a.type]).join(', ')}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {scenarios.length > 0 && (
        <div className="space-y-3">
          {scenarios.map((s) => (
            <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {s.isActive ? 'Активен' : 'Выключен'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{describeScenario(s)}</p>
                  <p className="text-xs text-gray-400 mt-1">Сработал: {s.runsCount} раз</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => toggleMutation.mutate({ id: s.id, isActive: !s.isActive })}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                  >
                    {s.isActive ? 'Выключить' : 'Включить'}
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(s.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="pt-2">
            <p className="text-sm text-gray-500 mb-3">Добавить из шаблона:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.name}
                  onClick={() => openTemplate(tpl)}
                  className="text-left bg-gray-50 hover:bg-white border border-gray-200 hover:border-blue-300 rounded-xl p-4 transition-all"
                >
                  <p className="text-sm font-medium text-gray-700">{tpl.name}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="text-center text-gray-400 text-sm py-10">Загрузка...</div>
      )}
    </div>
  )
}
