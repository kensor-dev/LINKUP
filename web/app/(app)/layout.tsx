'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'

const NAV = [
  { href: '/dashboard', label: 'Дашборд' },
  { href: '/orders', label: 'Заказы' },
  { href: '/couriers', label: 'Курьеры' },
  { href: '/customers', label: 'Клиенты' },
  { href: '/tasks', label: 'Задачи' },
  { href: '/scenarios', label: 'Сценарии' },
  { href: '/analytics/crm', label: 'CRM аналитика' },
  { href: '/analytics/couriers', label: 'Курьеры: стат.' },
  { href: '/settings', label: 'Настройки' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, accessToken, loadFromStorage, logout } = useAuthStore()

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  useEffect(() => {
    if (!accessToken && !localStorage.getItem('accessToken')) {
      router.replace('/login')
    }
  }, [accessToken, router])

  function handleLogout() {
    logout()
    router.push('/login')
  }

  return (
    <div className="flex h-full">
      <aside className="w-56 bg-slate-900 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-700">
          <span className="text-lg font-bold tracking-tight">
            <span className="text-white">LINK</span><span className="text-blue-400">UP</span>
          </span>
          {user && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{user.businessName}</p>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-4 border-t border-slate-700">
          {user && (
            <p className="text-xs text-slate-400 truncate mb-2">{user.email}</p>
          )}
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-slate-400 hover:text-red-400 transition-colors"
          >
            Выйти
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-slate-100">{children}</main>
    </div>
  )
}
