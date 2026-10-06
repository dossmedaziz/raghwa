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
  Otp: { ctx: 'signup' | 'forgot' | 'phone'; phone: string }
  Forgot: { phone?: string } | undefined
  NewPass: undefined
  Location: undefined
  Tabs: NavigatorScreenParams<TabParams>
  Garage: { gid: string }
  Book1: undefined
  Book2: undefined
  Book3: undefined
  Success: undefined
  Resched2: undefined
  ResDetail: { ref: string }
  Cars: undefined
  CarForm: { id?: string } | undefined
  Language: undefined
  Appearance: undefined
  Notif: undefined
  ChangePw: undefined
  ChangePhone: undefined
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
