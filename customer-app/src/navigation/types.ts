import type { NavigatorScreenParams } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

export type TabParams = {
  Map: undefined
  Reservations: { seg?: 'up' | 'past' | 'cancelled' } | undefined
  Profile: undefined
}

export type RootParams = {
  Splash: undefined
  Lang: undefined
  Intro: undefined
  Login: undefined
  Signup: undefined
  /** Edit the name (from the profile). */
  Name: undefined
  Location: undefined
  Tabs: NavigatorScreenParams<TabParams>
  /** `km`: distance shown on the map list, when known. */
  Garage: { gid: string; km?: number | null }
  Book1: undefined
  Book2: undefined
  Book3: undefined
  Success: undefined
  Resched2: undefined
  ResDetail: { id: string }
  Cars: undefined
  CarForm: { id?: string } | undefined
  Language: undefined
  Appearance: undefined
  Notif: undefined
  Help: undefined
  Terms: undefined
}

export type ScreenProps<K extends keyof RootParams> = NativeStackScreenProps<RootParams, K>

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootParams {}
  }
}
