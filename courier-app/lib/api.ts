import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function saveToken(token: string) {
  await SecureStore.setItemAsync('accessToken', token)
}

export async function getToken() {
  return SecureStore.getItemAsync('accessToken')
}

export async function removeToken() {
  await SecureStore.deleteItemAsync('accessToken')
}
