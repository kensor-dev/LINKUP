import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api, removeToken } from '../lib/api'
import { startShift, stopShift, getShiftActive } from '../lib/gps'

interface Order {
  id: string
  status: string
  deliveryAddress: string
  totalAmount: number | null
  notes: string | null
  customer: { name: string | null; phone: string }
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

const STATUS_COLORS: Record<string, string> = {
  NEW: '#6B7280',
  ASSIGNED: '#1D4ED8',
  PICKED_UP: '#B45309',
  IN_TRANSIT: '#C2410C',
  DELIVERED: '#15803D',
  FAILED: '#B91C1C',
  CANCELLED: '#9CA3AF',
}

const ACTIVE_STATUSES = new Set(['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'])

export default function OrdersScreen() {
  const insets = useSafeAreaInsets()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [shiftActive, setShiftActive] = useState(getShiftActive())
  const [shiftLoading, setShiftLoading] = useState(false)

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await api.get('/api/couriers/my-orders')
      setOrders(data)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) {
        await removeToken()
        router.replace('/')
      }
    }
  }, [])

  useEffect(() => {
    fetchOrders().finally(() => setLoading(false))
  }, [fetchOrders])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchOrders()
    setRefreshing(false)
  }

  async function handleToggleShift() {
    setShiftLoading(true)
    try {
      if (shiftActive) {
        await stopShift()
        setShiftActive(false)
      } else {
        await startShift()
        setShiftActive(true)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка'
      Alert.alert('Ошибка', msg)
    } finally {
      setShiftLoading(false)
    }
  }

  async function handleLogout() {
    Alert.alert('Выход', 'Выйти из аккаунта?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: async () => {
          if (shiftActive) await stopShift()
          await removeToken()
          router.replace('/')
        },
      },
    ])
  }

  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.has(o.status))
  const otherOrders = orders.filter((o) => !ACTIVE_STATUSES.has(o.status))

  function renderOrder({ item }: { item: Order }) {
    const isActive = ACTIVE_STATUSES.has(item.status)
    return (
      <TouchableOpacity
        style={[styles.card, isActive && styles.cardActive]}
        onPress={() => router.push(`/order/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] }]} />
          <Text style={styles.statusText}>{STATUS_LABELS[item.status]}</Text>
          {item.totalAmount ? (
            <Text style={styles.amount}>{item.totalAmount.toLocaleString('ru')} ₽</Text>
          ) : null}
        </View>
        <Text style={styles.address} numberOfLines={2}>
          {item.deliveryAddress}
        </Text>
        <Text style={styles.customer}>
          {item.customer.name || item.customer.phone}
        </Text>
        {item.notes ? (
          <Text style={styles.notes} numberOfLines={1}>
            {item.notes}
          </Text>
        ) : null}
      </TouchableOpacity>
    )
  }

  function ListHeader() {
    return (
      <View style={styles.shiftBlock}>
        <TouchableOpacity
          style={[styles.shiftButton, shiftActive ? styles.shiftButtonOn : styles.shiftButtonOff]}
          onPress={handleToggleShift}
          disabled={shiftLoading}
          activeOpacity={0.8}
        >
          {shiftLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <View style={[styles.shiftDot, shiftActive ? styles.shiftDotOn : styles.shiftDotOff]} />
              <Text style={styles.shiftButtonText}>
                {shiftActive ? 'Смена активна — нажми чтобы завершить' : 'Начать смену'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {activeOrders.length > 0 && (
          <Text style={styles.sectionTitle}>Активные</Text>
        )}
      </View>
    )
  }

  const allItems = [
    ...activeOrders,
    ...(otherOrders.length > 0 ? [{ _separator: true, id: '__sep' } as unknown as Order] : []),
    ...otherOrders,
  ]

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1A56DB" />
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>Мои заказы</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Выйти</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={allItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          if ((item as unknown as { _separator: boolean })._separator) {
            return <Text style={styles.sectionTitle}>История</Text>
          }
          return renderOrder({ item })
        }}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Заказов нет</Text>
            <Text style={styles.emptySubtext}>Когда диспетчер назначит заказ — он появится здесь</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1A56DB" />
        }
        contentContainerStyle={styles.list}
      />
    </View>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  logoutText: {
    fontSize: 14,
    color: '#EF4444',
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  shiftBlock: {
    marginBottom: 6,
  },
  shiftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 16,
    gap: 10,
  },
  shiftButtonOn: {
    backgroundColor: '#16A34A',
  },
  shiftButtonOff: {
    backgroundColor: '#1A56DB',
  },
  shiftDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  shiftDotOn: {
    backgroundColor: '#BBF7D0',
  },
  shiftDotOff: {
    backgroundColor: '#BFDBFE',
  },
  shiftButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  cardActive: {
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  address: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 21,
  },
  customer: {
    fontSize: 13,
    color: '#6B7280',
  },
  notes: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
})
