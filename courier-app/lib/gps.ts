import * as Location from 'expo-location'
import { api } from './api'

interface Coords {
  lat: number
  lng: number
}

let intervalId: ReturnType<typeof setInterval> | null = null
let pendingCoords: Coords[] = []
let isShiftActive = false

async function sendCoords(coords: Coords[]) {
  if (coords.length === 0) return
  const last = coords[coords.length - 1]
  try {
    await api.post('/api/gps/location', { lat: last.lat, lng: last.lng })
    pendingCoords = []
  } catch {
    // оставляем в очереди, попробуем в следующий раз
  }
}

export async function requestPermissions() {
  const { status: fg } = await Location.requestForegroundPermissionsAsync()
  if (fg !== 'granted') return false

  const { status: bg } = await Location.requestBackgroundPermissionsAsync()
  return bg === 'granted'
}

export async function startShift() {
  if (isShiftActive) return

  const hasPermission = await requestPermissions()
  if (!hasPermission) {
    throw new Error('Нет разрешения на геолокацию')
  }

  try {
    await api.post('/api/gps/online')
  } catch {
    // игнорируем, смена всё равно начинается локально
  }

  isShiftActive = true

  intervalId = setInterval(async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })
      const coords: Coords = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      }
      pendingCoords.push(coords)
      await sendCoords(pendingCoords)
    } catch {
      // нет геолокации, ждём следующего тика
    }
  }, 5000)
}

export async function stopShift() {
  if (!isShiftActive) return

  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }

  isShiftActive = false
  pendingCoords = []

  try {
    await api.post('/api/gps/offline')
  } catch {
    // игнорируем
  }
}

export function getShiftActive() {
  return isShiftActive
}
