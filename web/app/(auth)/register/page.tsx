'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

export default function RegisterPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/api/auth/register', { businessName, email, password })
      setAuth(data.user, data.accessToken)
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Ошибка регистрации'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-full flex">
      <div className="hidden lg:flex lg:w-[55%] bg-slate-900 flex-col relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-[-80px] left-[-80px] w-[400px] h-[400px] rounded-full bg-blue-600 opacity-10" />
          <div className="absolute bottom-[-60px] right-[-60px] w-[350px] h-[350px] rounded-full bg-indigo-500 opacity-10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-slate-700 opacity-30" />
          <div className="absolute top-[60%] left-[10%] w-[180px] h-[180px] rounded-full bg-blue-500 opacity-5" />
        </div>

        <div className="relative z-10 flex flex-col h-full px-12 py-10">
          <div>
            <span className="text-2xl font-bold text-white tracking-tight">LINKUP</span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <p className="text-slate-400 text-sm font-medium uppercase tracking-widest mb-4">
              Начните бесплатно
            </p>
            <h2 className="text-5xl font-bold text-white leading-tight mb-6">
              Запустите доставку<br />
              <span className="text-blue-400">за 5 минут</span>
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
              Зарегистрируйте бизнес и начните принимать заказы. Без лишних настроек.
            </p>

            <div className="mt-12 space-y-4">
              {[
                'Неограниченное число курьеров',
                'GPS-трекинг в реальном времени',
                'Push-уведомления для курьеров',
                'Аналитика и CRM в одном месте',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-slate-300 text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-slate-600 text-xs">
            © 2025 LINKUP. Все права защищены.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <span className="text-2xl font-bold text-slate-900">LINKUP</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-1">Создайте аккаунт</h1>
          <p className="text-slate-500 text-sm mb-8">Для вашего бизнеса — бесплатно</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Название бизнеса</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
                placeholder="Цветочный магазин"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Пароль</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
                placeholder="Минимум 6 символов"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? 'Создаём аккаунт...' : 'Создать аккаунт'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Уже есть аккаунт?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
