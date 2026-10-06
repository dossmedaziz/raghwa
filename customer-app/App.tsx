import { useEffect, useRef, useState } from 'react'
import { View, useColorScheme } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts } from 'expo-font'
import { Cairo_400Regular, Cairo_500Medium, Cairo_600SemiBold, Cairo_700Bold, Cairo_800ExtraBold } from '@expo-google-fonts/cairo'
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter'
import { MaterialIcons } from '@expo/vector-icons'
import { ThemeProvider } from '@shopify/restyle'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { DarkTheme, DefaultTheme, NavigationContainer, type NavigationState } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { applyScheme, colors, themes, type Scheme } from '@/theme'
import { initMapbox } from '@/lib/mapbox'
import { useT } from '@/lib/i18n'
import { useStore } from '@/store'
import { ToastHost } from '@/components/ui'
import { TAB_H, TabBar } from '@/components/screen'
import type { RootParams, TabParams } from '@/navigation/types'
import { IntroScreen, LangScreen, LocationScreen, SplashScreen as Splash } from '@/screens/onboarding'
import { ForgotScreen, LoginScreen, NewPassScreen, OtpScreen, SignupScreen } from '@/screens/auth'
import { MapScreen } from '@/screens/map'
import { GarageScreen } from '@/screens/garage'
import { Book1Screen, Book2Screen, Book3Screen, Resched2Screen, SuccessScreen } from '@/screens/booking'
import { ResDetailScreen, ReservationsScreen } from '@/screens/reservations'
import {
  CarFormScreen, CarsScreen, ChangePhoneScreen, ChangePwScreen, AppearanceScreen, HelpScreen, LanguageScreen, NotifScreen, ProfileScreen, TermsScreen,
} from '@/screens/profile'

SplashScreen.preventAutoHideAsync().catch(() => {})
initMapbox()

const Stack = createNativeStackNavigator<RootParams>()
const Tab = createBottomTabNavigator<TabParams>()

function Tabs() {
  return (
    <Tab.Navigator tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Reservations" component={ReservationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}

/** Waits until the persisted language/session flags are read from storage. */
function useHydrated() {
  const [done, setDone] = useState(useStore.persist.hasHydrated())
  useEffect(() => useStore.persist.onFinishHydration(() => setDone(true)), [])
  return done
}

/** Resolves the appearance setting against the phone's light/dark mode. */
function useScheme(): Scheme {
  const appearance = useStore((s) => s.appearance)
  const system = useColorScheme()
  return appearance === 'system' ? (system === 'dark' ? 'dark' : 'light') : appearance
}

function Root({ scheme }: { scheme: Scheme }) {
  const { dir, ar } = useT()
  const insets = useSafeAreaInsets()
  const authed = useStore((s) => s.authed), onboarded = useStore((s) => s.onboarded)
  // Decided once at start-up; later changes navigate explicitly.
  const [initial] = useState<keyof RootParams>(authed ? 'Tabs' : onboarded ? 'Login' : 'Splash')
  // Switching theme remounts the tree (key below); the navigation state is kept so the user stays put.
  const navState = useRef<NavigationState | undefined>(undefined)
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme
  return (
    // RTL via the `direction` layout style: instant language switching, and it works in Expo Go
    // (I18nManager.forceRTL needs a reload and is reset by Expo Go).
    <View key={scheme} style={{ flex: 1, direction: dir, backgroundColor: colors.bg }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {/* Inside the `direction` view so bottom-sheet modals follow the reading direction. */}
      <BottomSheetModalProvider>
        <NavigationContainer theme={{ ...base, colors: { ...base.colors, background: colors.bg, card: colors.bg } }}
          initialState={navState.current} onStateChange={(st) => { navState.current = st }}>
          <Stack.Navigator initialRouteName={initial}
            screenOptions={{ headerShown: false, animation: ar ? 'slide_from_left' : 'slide_from_right', contentStyle: { backgroundColor: colors.bg } }}>
            <Stack.Screen name="Splash" component={Splash} options={{ animation: 'fade' }} />
            <Stack.Screen name="Lang" component={LangScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="Intro" component={IntroScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="Otp" component={OtpScreen} />
            <Stack.Screen name="Forgot" component={ForgotScreen} />
            <Stack.Screen name="NewPass" component={NewPassScreen} />
            <Stack.Screen name="Location" component={LocationScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="Tabs" component={Tabs} options={{ animation: 'fade' }} />
            <Stack.Screen name="Garage" component={GarageScreen} />
            <Stack.Screen name="Book1" component={Book1Screen} />
            <Stack.Screen name="Book2" component={Book2Screen} />
            <Stack.Screen name="Book3" component={Book3Screen} />
            <Stack.Screen name="Success" component={SuccessScreen} options={{ animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="Resched2" component={Resched2Screen} />
            <Stack.Screen name="ResDetail" component={ResDetailScreen} />
            <Stack.Screen name="Cars" component={CarsScreen} />
            <Stack.Screen name="CarForm" component={CarFormScreen} />
            <Stack.Screen name="Language" component={LanguageScreen} />
            <Stack.Screen name="Appearance" component={AppearanceScreen} />
            <Stack.Screen name="Notif" component={NotifScreen} />
            <Stack.Screen name="ChangePw" component={ChangePwScreen} />
            <Stack.Screen name="ChangePhone" component={ChangePhoneScreen} />
            <Stack.Screen name="Help" component={HelpScreen} />
            <Stack.Screen name="Terms" component={TermsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </BottomSheetModalProvider>
      <ToastHost bottom={insets.bottom + TAB_H + 16} />
    </View>
  )
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Cairo_400Regular, Cairo_500Medium, Cairo_600SemiBold, Cairo_700Bold, Cairo_800ExtraBold,
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
    ...MaterialIcons.font,
  })
  const hydrated = useHydrated()
  const scheme = useScheme()
  // Swap the palette before any child renders with it.
  applyScheme(scheme)
  const ready = fontsLoaded && hydrated
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}) }, [ready])
  if (!ready) return null
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider theme={themes[scheme]}>
          <Root scheme={scheme} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
