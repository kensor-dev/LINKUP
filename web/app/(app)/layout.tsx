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
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-200">
          <span className="text-lg font-bold text-blue-600">LINKUP</span>
          {user && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{user.businessName}</p>
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
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-4 border-t border-gray-200">
          {user && (
            <p className="text-xs text-gray-500 truncate mb-2">{user.email}</p>
          )}
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            Выйти
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
