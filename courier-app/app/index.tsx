import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { router } from 'expo-router'
import { api, saveToken, getToken } from '../lib/api'

type Step = 'phone' | 'code'

export default function LoginScreen() {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    getToken().then((token) => {
      if (token) router.replace('/orders')
      else setChecking(false)
    })
  }, [])

  async function handleSendCode() {
    const cleaned = phone.trim()
    if (cleaned.length < 10) {
      Alert.alert('Ошибка', 'Введите корректный номер телефона')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/api/auth/courier/send-code', { phone: cleaned })
      if (__DEV__ && data.code) {
        Alert.alert('Код для разработки', `Ваш код: ${data.code}`)
      }
      setStep('code')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      Alert.alert('Ошибка', msg ?? 'Номер не найден. Обратитесь к диспетчеру.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyCode() {
    if (code.length !== 4) {
      Alert.alert('Ошибка', 'Введите 4-значный код')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/api/auth/courier/verify-code', {
        phone: phone.trim(),
        code,
      })
      await saveToken(data.accessToken)
      router.replace('/orders')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      Alert.alert('Ошибка', msg ?? 'Неверный код. Попробуйте ещё раз.')
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1A56DB" />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>L</Text>
          </View>
          <Text style={styles.title}>LINKUP</Text>
          <Text style={styles.subtitle}>Приложение курьера</Text>
        </View>

        {step === 'phone' ? (
          <View style={styles.form}>
            <Text style={styles.label}>Ваш номер телефона</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+7 999 123-45-67"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              autoComplete="tel"
              returnKeyType="done"
              onSubmitEditing={handleSendCode}
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSendCode}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Получить код</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>Код из SMS</Text>
            <Text style={styles.phoneHint}>Отправили на {phone}</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              value={code}
              onChangeText={setCode}
              placeholder="0000"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleVerifyCode}
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerifyCode}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Войти</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => { setStep('phone'); setCode('') }}
            >
              <Text style={styles.backButtonText}>← Изменить номер</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
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
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#1A56DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 6,
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  phoneHint: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: -8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  codeInput: {
    fontSize: 28,
    letterSpacing: 12,
    textAlign: 'center',
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#1A56DB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#6B7280',
    fontSize: 14,
  },
})
