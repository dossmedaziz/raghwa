import { useEffect, useState } from 'react'
import NetInfo from '@react-native-community/netinfo'
import { Box, Button, Icon, Text } from '@/components/ui'
import { useT } from '@/lib/i18n'

/** True unless the device reports it has no connection. */
export function useOnline() {
  const [online, setOnline] = useState(true)
  useEffect(() => NetInfo.addEventListener((s) => setOnline(s.isConnected !== false)), [])
  return online
}

/** "No internet" state shown on the map and reservations tabs. */
export function OfflineView() {
  const { t } = useT()
  return (
    <Box flex={1} backgroundColor="bg" alignItems="center" justifyContent="center" gap="m" style={{ paddingHorizontal: 40 }}>
      <Box width={120} height={120} borderRadius="pill" backgroundColor="grey100" alignItems="center" justifyContent="center">
        <Icon name="wifi_off" size={56} color="grey600" />
      </Box>
      <Text w={800} fontSize={24} align="center">{t.offline_t}</Text>
      <Text fontSize={16} color="grey600" lh={1.5} align="center">{t.offline_s}</Text>
      <Button label={t.retry} icon="refresh" height={48} fontSize={16} px={28} onPress={() => NetInfo.refresh()} style={{ marginTop: 8 }} />
    </Box>
  )
}
