import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { api } from './api'

const isExpoGo = Constants.appOwnership === 'expo'

export async function registerPushToken() {
  if (isExpoGo || Platform.OS === 'web') return

  const Notifications = await import('expo-notifications')

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return

  const token = (await Notifications.getExpoPushTokenAsync()).data

  try {
    await api.post('/api/couriers/push-token', { token })
  } catch {
    // не блокируем если токен не сохранился
  }
}

export function addNotificationListener(
  handler: (notification: unknown) => void
) {
  if (isExpoGo) return { remove: () => {} }

  let sub: { remove: () => void } = { remove: () => {} }
  import('expo-notifications').then((Notifications) => {
    sub = Notifications.addNotificationReceivedListener(handler as never)
  })
  return { remove: () => sub.remove() }
}

export function addResponseListener(
  handler: (response: unknown) => void
) {
  if (isExpoGo) return { remove: () => {} }

  let sub: { remove: () => void } = { remove: () => {} }
  import('expo-notifications').then((Notifications) => {
    sub = Notifications.addNotificationResponseReceivedListener(handler as never)
  })
  return { remove: () => sub.remove() }
}
