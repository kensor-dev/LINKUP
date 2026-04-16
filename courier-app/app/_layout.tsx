import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { registerPushToken, addResponseListener } from '../lib/notifications'
import { router } from 'expo-router'
import { getToken } from '../lib/api'

export default function RootLayout() {
  useEffect(() => {
    getToken().then((token) => {
      if (token) registerPushToken()
    })

    const sub = addResponseListener((response) => {
      const orderId = response.notification.request.content.data?.orderId
      if (orderId) router.push(`/order/${orderId}`)
    })

    return () => sub.remove()
  }, [])

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#ffffff' },
          headerTintColor: '#111827',
          headerTitleStyle: { fontWeight: '600', fontSize: 17 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#F9FAFB' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="orders" options={{ title: 'Мои заказы', headerBackVisible: false }} />
        <Stack.Screen name="order/[id]" options={{ title: 'Заказ' }} />
      </Stack>
    </>
  )
}
