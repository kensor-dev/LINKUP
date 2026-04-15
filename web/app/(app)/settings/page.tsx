'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

interface BusinessSettings {
  id: string
  name: string
  email: string
  logoUrl: string | null
  brandColor: string
  createdAt: string
}

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Владелец',
  DISPATCHER: 'Диспетчер',
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function SettingsPage() {
  const qc = useQueryClient()
  const { user, setAuth, accessToken } = useAuthStore()

  const [businessName, setBusinessName] = useState('')
  const [brandColor, setBrandColor] = useState('')
  const [editingBusiness, setEditingBusiness] = useState(false)
  const [businessError, setBusinessError] = useState('')

  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'OWNER' | 'DISPATCHER'>('DISPATCHER')
  const [invitePassword, setInvitePassword] = useState('')
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteError, setInviteError] = useState('')

  const logoInputRef = useRef<HTMLInputElement>(null)

  const { data: settings, isLoading } = useQuery<BusinessSettings>({
    queryKey: ['settings'],
    queryFn: () => api.get('/api/settings').then((r) => r.data),
  })

  const { data: members = [] } = useQuery<TeamMember[]>({
    queryKey: ['settings-users'],
    queryFn: () => api.get('/api/settings/users').then((r) => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; brandColor?: string }) =>
      api.patch('/api/settings', data).then((r) => r.data),
    onSuccess: (updated: BusinessSettings) => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      setEditingBusiness(false)
      setBusinessError('')
      if (user && accessToken) {
        setAuth({ ...user, businessName: updated.name }, accessToken)
      }
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Ошибка'
      setBusinessError(msg)
    },
  })

  const logoMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('logo', file)
      return api.post('/api/settings/logo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })

  const inviteMutation = useMutation({
    mutationFn: (data: { name: string; email: string; role: string; password: string }) =>
      api.post('/api/settings/users', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-users'] })
      setShowInviteForm(false)
      setInviteName('')
      setInviteEmail('')
      setInvitePassword('')
      setInviteError('')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Ошибка'
      setInviteError(msg)
    },
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/settings/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings-users'] }),
  })

  function startEditBusiness() {
    if (!settings) return
    setBusinessName(settings.name)
    setBrandColor(settings.brandColor)
    setEditingBusiness(true)
  }

  function handleSaveBusiness(e: React.FormEvent) {
    e.preventDefault()
    setBusinessError('')
    updateMutation.mutate({ name: businessName, brandColor })
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) logoMutation.mutate(file)
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteError('')
    inviteMutation.mutate({ name: inviteName, email: inviteEmail, role: inviteRole, password: invitePassword })
  }

  if (isLoading) return <div className="p-6 text-gray-400 text-sm">Загрузка...</div>
  if (!settings) return null

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900">Настройки</h1>

      {/* Профиль бизнеса */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">Профиль бизнеса</h2>
          {!editingBusiness && (
            <button onClick={startEditBusiness} className="text-xs text-blue-600 hover:underline">
              Изменить
            </button>
          )}
        </div>

        <div className="flex items-start gap-5 mb-5">
          <div className="flex-shrink-0">
            {settings.logoUrl ? (
              <img
                src={`${API_URL}${settings.logoUrl}`}
                alt="Логотип"
                className="w-16 h-16 rounded-xl object-contain border border-gray-200"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold"
                style={{ backgroundColor: settings.brandColor }}
              >
                {settings.name[0]}
              </div>
            )}
            <button
              onClick={() => logoInputRef.current?.click()}
              disabled={logoMutation.isPending}
              className="mt-2 w-16 text-center text-xs text-gray-500 hover:text-blue-600 transition-colors"
            >
              {logoMutation.isPending ? '...' : 'Загрузить'}
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
            />
          </div>

          {editingBusiness ? (
            <form onSubmit={handleSaveBusiness} className="flex-1 space-y-4">
              {businessError && (
                <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">
                  {businessError}
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Название</label>
                <input
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Цвет бренда</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                  />
                  <input
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    pattern="^#[0-9a-fA-F]{6}$"
                    className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {updateMutation.isPending ? 'Сохраняем...' : 'Сохранить'}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingBusiness(false); setBusinessError('') }}
                  className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Отмена
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2.5">
              <div>
                <p className="text-xs text-gray-400">Название</p>
                <p className="text-sm font-medium text-gray-900">{settings.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-sm text-gray-700">{settings.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Цвет бренда</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div
                    className="w-5 h-5 rounded-md border border-gray-200"
                    style={{ backgroundColor: settings.brandColor }}
                  />
                  <span className="text-sm font-mono text-gray-700">{settings.brandColor}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Команда */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Команда</h2>
          {user?.role === 'OWNER' && !showInviteForm && (
            <button
              onClick={() => setShowInviteForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              + Добавить
            </button>
          )}
        </div>

        {showInviteForm && (
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Новый сотрудник</h3>
            <form onSubmit={handleInvite} className="space-y-3">
              {inviteError && (
                <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">
                  {inviteError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Имя</label>
                  <input
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Иван Петров"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email</label>
                  <input
                    required
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ivan@mail.ru"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Пароль</label>
                  <input
                    required
                    type="password"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Минимум 6 символов"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Роль</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'OWNER' | 'DISPATCHER')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="DISPATCHER">Диспетчер</option>
                    <option value="OWNER">Владелец</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {inviteMutation.isPending ? 'Добавляем...' : 'Добавить'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowInviteForm(false); setInviteError('') }}
                  className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {members.map((m) => (
            <div key={m.id} className="flex items-center px-6 py-3.5">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-semibold mr-3 flex-shrink-0">
                {m.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {m.name}
                  {m.id === user?.id && (
                    <span className="ml-2 text-xs text-gray-400">(вы)</span>
                  )}
                </p>
                <p className="text-xs text-gray-500">{m.email}</p>
              </div>
              <span className="text-xs text-gray-500 mr-4">{ROLE_LABELS[m.role]}</span>
              {user?.role === 'OWNER' && m.id !== user?.id && (
                <button
                  onClick={() => removeMutation.mutate(m.id)}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  Удалить
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
