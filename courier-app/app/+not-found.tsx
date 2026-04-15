import { View, Text, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { TouchableOpacity } from 'react-native'

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Страница не найдена</Text>
      <TouchableOpacity onPress={() => router.replace('/')}>
        <Text style={styles.link}>На главную</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },
  text: { fontSize: 16, color: '#374151', marginBottom: 16 },
  link: { fontSize: 15, color: '#1A56DB' },
})
