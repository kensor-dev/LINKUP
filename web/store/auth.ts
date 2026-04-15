'use client'

import { create } from 'zustand'

interface User {
  id: string
  name: string
  email: string
  role: string
  businessId: string
  businessName: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  setAuth: (user: User, token: string) => void
  logout: () => void
  loadFromStorage: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,

  setAuth: (user, token) => {
    localStorage.setItem('accessToken', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, accessToken: token })
  },

  logout: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    set({ user: null, accessToken: null })
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('accessToken')
    const userStr = localStorage.getItem('user')
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User
        set({ user, accessToken: token })
      } catch {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('user')
      }
    }
  },
}))
