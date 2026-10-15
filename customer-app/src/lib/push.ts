// Push notifications (Expo Push Service): the API pushes to this phone when the garage marks a wash done or
// cancels a booking.
// Needs a development or store build: Expo Go on Android has no remote notifications. Web is skipped.
import { useEffect } from 'react'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import type { Lang } from '@/data/constants'
import { api } from '@/lib/api'
import { invalidate } from '@/lib/query'
import { useStore } from '@/store'

const supported = Platform.OS !== 'web'

/** Same id as `channelId` in the API's ExpoPushSender. */
const CHANNEL = 'default'

if (supported) {
  // Also show the banner while the app is open.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  })
}

/**
 * Asks for permission (once; the OS remembers the answer) and sends this phone's push token to the API with the
 * app language, so pushes are written in it. Silently does nothing if refused or unavailable.
 */
export async function registerForPush(lang: Lang): Promise<void> {
  if (!supported) return
  // On Android 13+ the permission prompt only appears once a channel exists.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Raghwa', importance: Notifications.AndroidImportance.HIGH })
  }
  let { granted } = await Notifications.getPermissionsAsync()
  if (!granted) granted = (await Notifications.requestPermissionsAsync()).granted
  if (!granted) return
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
  // Signed out meanwhile: do not attach the phone to a session that just ended.
  if (!useStore.getState().tokens) return
  await api.push.register(token, lang)
  useStore.getState().setPushToken(token)
}

/** Data the API attaches to its pushes. */
type PushData = { type?: string; reservationId?: string }

/**
 * Keeps the phone registered while signed in (again when the language changes), refreshes the screens when a push
 * arrives, and calls `onOpenReservation` when the user taps one, including the tap that launched the app.
 */
export function usePushNotifications(onOpenReservation: (id: string) => void) {
  const authed = useStore((s) => !!s.tokens), lang = useStore((s) => s.lang)

  useEffect(() => {
    // Failing is not shown to users (the app works without pushes), but logged in development:
    // e.g. "Default FirebaseApp is not initialized" means google-services.json is missing from the build.
    if (authed) registerForPush(lang).catch((err: unknown) => { if (__DEV__) console.warn('Push registration failed:', err) })
  }, [authed, lang])

  useEffect(() => {
    if (!supported) return
    const open = (r: Notifications.NotificationResponse | null) => {
      if (!r || r.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return
      const { reservationId } = r.notification.request.content.data as PushData
      invalidate()
      if (reservationId) onOpenReservation(reservationId)
      // Handled: a later start must not open it again.
      Notifications.clearLastNotificationResponseAsync().catch(() => {})
    }
    Notifications.getLastNotificationResponseAsync().then(open, () => {})
    const tapped = Notifications.addNotificationResponseReceivedListener(open)
    // A reservation changed (e.g. the wash is done): lists and details refetch.
    const received = Notifications.addNotificationReceivedListener(() => invalidate())
    return () => {
      tapped.remove()
      received.remove()
    }
  }, [onOpenReservation])
}
