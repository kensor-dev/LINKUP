import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api } from '../../lib/api'

interface OrderDetail {
  id: string
  status: string
  deliveryAddress: string
  deliveryLat: number | null
  deliveryLng: number | null
  totalAmount: number | null
  notes: string | null
  items: { name: string; qty: number; price: number }[]
  customer: { name: string | null; phone: string }
  business: { name: string }
  createdAt: string
}

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Новый',
  ASSIGNED: 'Назначен',
  PICKED_UP: 'Забрал товар',
  IN_TRANSIT: 'В пути',
  DELIVERED: 'Доставлен',
  FAILED: 'Не застал',
  CANCELLED: 'Отменён',
}

const NEXT_STATUSES: Record<string, { status: string; label: string; color: string }[]> = {
  ASSIGNED: [
    { status: 'PICKED_UP', label: 'Забрал товар', color: '#1A56DB' },
    { status: 'FAILED', label: 'Не застал', color: '#EF4444' },
  ],
  PICKED_UP: [
    { status: 'IN_TRANSIT', label: 'Еду к клиенту', color: '#1A56DB' },
  ],
  IN_TRANSIT: [
    { status: 'DELIVERED', label: 'Доставил', color: '#16A34A' },
    { status: 'FAILED', label: 'Не застал', color: '#EF4444' },
  ],
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusLoading, setStatusLoading] = useState(false)

  const fetchOrder = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/couriers/my-orders/${id}`)
      setOrder(data)
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить заказ')
      router.back()
    }
  }, [id])

  useEffect(() => {
    fetchOrder().finally(() => setLoading(false))
  }, [fetchOrder])

  async function handleStatusChange(status: string) {
    if (!order) return
    const next = NEXT_STATUSES[order.status]?.find((s) => s.status === status)
    if (!next) return

    Alert.alert('Подтверждение', `Изменить статус на "${next.label}"?`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Подтвердить',
        onPress: async () => {
          setStatusLoading(true)
          try {
            await api.patch(`/api/couriers/my-orders/${id}/status`, { status })
            await fetchOrder()
          } catch {
            Alert.alert('Ошибка', 'Не удалось обновить статус')
          } finally {
            setStatusLoading(false)
          }
        },
      },
    ])
  }

  function openInMaps() {
    if (!order) return
    const address = encodeURIComponent(order.deliveryAddress)
    const coords =
      order.deliveryLat && order.deliveryLng
        ? `${order.deliveryLat},${order.deliveryLng}`
        : null

    const url = Platform.select({
      ios: coords
        ? `maps://?ll=${coords}&q=${address}`
        : `maps://?q=${address}`,
      android: coords
        ? `geo:${coords}?q=${coords}(${address})`
        : `geo:0,0?q=${address}`,
    })

    if (url) {
      Linking.openURL(url).catch(() => {
        Linking.openURL(
          `https://2gis.ru/search/${address}`
        )
      })
    }
  }

  function callCustomer() {
    if (!order) return
    Linking.openURL(`tel:${order.customer.phone}`)
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1A56DB" />
      </View>
    )
  }

  if (!order) return null

  const nextStatuses = NEXT_STATUSES[order.status] ?? []
  const isDone = ['DELIVERED', 'FAILED', 'CANCELLED'].includes(order.status)

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
    >
      {/* Статус */}
      <View style={styles.statusBlock}>
        <Text style={styles.statusLabel}>{STATUS_LABELS[order.status]}</Text>
      </View>

      {/* Адрес */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Адрес доставки</Text>
        <Text style={styles.address}>{order.deliveryAddress}</Text>
        <TouchableOpacity style={styles.mapsButton} onPress={openInMaps} activeOpacity={0.7}>
          <Text style={styles.mapsButtonText}>Открыть в картах</Text>
        </TouchableOpacity>
      </View>

      {/* Клиент */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Клиент</Text>
        <Text style={styles.customerName}>{order.customer.name || 'Имя не указано'}</Text>
        <TouchableOpacity style={styles.callButton} onPress={callCustomer} activeOpacity={0.7}>
          <Text style={styles.callButtonText}>📞 {order.customer.phone}</Text>
        </TouchableOpacity>
      </View>

      {/* Состав заказа */}
      {order.items && order.items.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Состав заказа</Text>
          {order.items.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.itemQty}>×{item.qty}</Text>
              <Text style={styles.itemPrice}>{(item.price * item.qty).toLocaleString('ru')} ₽</Text>
            </View>
          ))}
          {order.totalAmount ? (
            <View style={[styles.itemRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Итого</Text>
              <Text style={styles.totalAmount}>{order.totalAmount.toLocaleString('ru')} ₽</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Заметки */}
      {order.notes ? (
        <View style={styles.notesCard}>
          <Text style={styles.notesTitle}>Примечание</Text>
          <Text style={styles.notesText}>{order.notes}</Text>
        </View>
      ) : null}

      {/* Кнопки смены статуса */}
      {!isDone && nextStatuses.length > 0 && (
        <View style={styles.actionsBlock}>
          {statusLoading ? (
            <ActivityIndicator size="large" color="#1A56DB" style={{ marginVertical: 16 }} />
          ) : (
            nextStatuses.map((s) => (
              <TouchableOpacity
                key={s.status}
                style={[styles.actionButton, { backgroundColor: s.color }]}
                onPress={() => handleStatusChange(s.status)}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>{s.label}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {isDone && (
        <View style={styles.doneBlock}>
          <Text style={styles.doneText}>Заказ завершён</Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  statusBlock: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D4ED8',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  address: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 22,
  },
  mapsButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  mapsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A56DB',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  callButton: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 4,
  },
  callButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#16A34A',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  itemQty: {
    fontSize: 14,
    color: '#6B7280',
    width: 32,
    textAlign: 'right',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    width: 80,
    textAlign: 'right',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  notesCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 6,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 15,
    color: '#78350F',
    lineHeight: 21,
  },
  actionsBlock: {
    gap: 10,
    marginTop: 8,
  },
  actionButton: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  doneBlock: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  doneText: {
    fontSize: 15,
    color: '#9CA3AF',
  },
})
