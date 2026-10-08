import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import * as Location from 'expo-location'
import { colors } from '@/theme'
import { Box, Bubbles, Button, Drop, Icon, LogoMark, LogoTile, Text } from '@/components/ui'
import { Footer, Screen } from '@/components/screen'
import { FOAM, INTRO_BUB, LOC_BUB, type Lang } from '@/data/constants'
import { price } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { useStore } from '@/store'
import type { ScreenProps } from '@/navigation/types'

/** Navy splash with foam; continues to the language picker after 2.2 s (or on tap). */
export function SplashScreen({ navigation }: ScreenProps<'Splash'>) {
  const { t } = useT()
  const next = () => navigation.replace('Lang')
  useEffect(() => {
    const id = setTimeout(next, 2200)
    return () => clearTimeout(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Pressable onPress={next} style={{ flex: 1, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <StatusBar style="light" />
      <Bubbles items={FOAM} white />
      <View style={{ marginBottom: 28 }}><LogoMark size={96} /></View>
      <Text w={800} fontSize={52} color="white" align="center" style={{ fontFamily: 'Cairo_800ExtraBold', lineHeight: 60 }}>رغوة</Text>
      <Text latin w={700} fontSize={14} color="aquaLight" align="center" style={{ letterSpacing: 6.3, marginTop: 8, paddingLeft: 6.3 }}>RAGHWA</Text>
      <Text fontSize={14} align="center" style={{ position: 'absolute', bottom: 64, color: 'rgba(255,255,255,.75)' }}>{t.tagline}</Text>
    </Pressable>
  )
}

/** Language option card, shared with Profile → Language. */
export function LangOptions({ onPick }: { onPick?: (l: Lang) => void }) {
  const lang = useStore((s) => s.lang), setLang = useStore((s) => s.setLang)
  const opts: [Lang, string, string, string][] = [['ar', 'ع', 'عربي', 'الدارجة التونسية'], ['fr', 'Fr', 'Français', 'Français']]
  return (
    <Box gap="sm">
      {opts.map(([k, code, label, sub]) => {
        const sel = lang === k
        const font = k === 'ar' ? 'Cairo' : 'Inter'
        return (
          <Pressable key={k} accessibilityRole="radio" accessibilityState={{ checked: sel }} onPress={() => { setLang(k); onPick?.(k) }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 16, height: 76, paddingHorizontal: 20, borderRadius: 16, borderWidth: 2, borderColor: sel ? colors.primary : colors.grey200, backgroundColor: sel ? colors.primaryTint : colors.bg }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.grey200, alignItems: 'center', justifyContent: 'center' }}>
              <Text w={800} fontSize={15} align="center" style={{ fontFamily: font + '_800ExtraBold' }}>{code}</Text>
            </View>
            <Box flex={1} gap="xxs">
              <Text w={700} fontSize={18} style={{ fontFamily: font + '_700Bold' }}>{label}</Text>
              <Text fontSize={13} color="grey600" style={{ fontFamily: font + '_400Regular' }}>{sub}</Text>
            </Box>
            <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: sel ? colors.primary : colors.grey400, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: sel ? colors.primary : 'transparent' }} />
            </View>
          </Pressable>
        )
      })}
    </Box>
  )
}

export function LangScreen({ navigation }: ScreenProps<'Lang'>) {
  const { t } = useT()
  return (
    <Screen>
      <Box flex={1} gap="xl" style={{ paddingTop: 48, paddingHorizontal: 24 }}>
        <LogoTile />
        <Box gap="xs">
          <Text w={800} fontSize={30} style={{ fontFamily: 'Cairo_800ExtraBold', lineHeight: 40 }}>اختار اللغة</Text>
          <Text latin w={700} fontSize={22} color="grey600">Choisissez votre langue</Text>
        </Box>
        <LangOptions />
      </Box>
      <Footer><Button label={t.continue} onPress={() => navigation.replace('Intro')} /></Footer>
    </Screen>
  )
}

const INTRO = [{ icon: 'location_on', chip: 'p' }, { icon: 'schedule', chip: 't' }, { icon: 'payments', chip: 'c' }] as const

/**
 * Three swipeable intro steps. In Arabic the LTR pager is mirrored (and each page mirrored back),
 * so the next step comes in from the left, following the reading direction, with no start offset.
 */
export function IntroScreen({ navigation }: ScreenProps<'Intro'>) {
  const { t, L, ar } = useT()
  const { width } = useWindowDimensions()
  const finish = useStore((s) => s.finishOnboarding)
  const [i, setI] = useState(0)
  const pager = useRef<ScrollView>(null)
  const done = () => { finish(); navigation.replace('Login') }

  const mirror = ar ? { transform: [{ scaleX: -1 }] } : null
  const goTo = (k: number) => {
    setI(k)
    pager.current?.scrollTo({ x: k * width, animated: true })
  }
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const k = Math.round(e.nativeEvent.contentOffset.x / width)
    if (k !== i && k >= 0 && k <= 2) setI(k)
  }

  const page = (k: number) => {
    const it = INTRO[k]
    const chip = it.chip === 'p' ? t.from.replace('{p}', price(10, L)) : it.chip === 'c' ? price(20, L) : '10:30'
    const title = [t.intro1_t, t.intro2_t, t.intro3_t][k], body = [t.intro1_b, t.intro2_b, t.intro3_b][k]
    return (
      // Pages sit in an LTR pager; restore the reading direction (and undo the mirror) for their content.
      <View key={k} style={[{ width, direction: ar ? 'rtl' : 'ltr' }, mirror]}>
        <Box flex={1} gap="xl" style={{ paddingTop: 8, paddingHorizontal: 24 }}>
          <View style={{ height: 330, borderRadius: 28, backgroundColor: colors.skyTint, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
            <Bubbles items={INTRO_BUB} />
            <View style={{ width: 168, height: 168, borderRadius: 84, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 12 }, elevation: 6 }}>
              <Icon name={it.icon} size={84} color="primary" />
            </View>
            <View style={{ position: 'absolute', top: 48, end: 28, height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Drop size={10} />
              <Text w={700} fontSize={14} color="white">{chip}</Text>
            </View>
          </View>
          <Box gap="sm">
            <Text w={800} fontSize={28} lh={1.3}>{title}</Text>
            <Text fontSize={16} color="grey600" lh={1.6}>{body}</Text>
          </Box>
        </Box>
      </View>
    )
  }

  return (
    <Screen>
      <Box flexDirection="row" justifyContent="flex-end" alignItems="center" height={56} paddingHorizontal="m">
        <Pressable onPress={done} style={{ height: 40, paddingHorizontal: 18, borderRadius: 999, backgroundColor: colors.grey100, justifyContent: 'center' }}>
          <Text w={600} fontSize={15}>{t.skip}</Text>
        </Pressable>
      </Box>
      <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} bounces={false}
        style={[{ flex: 1, direction: 'ltr' }, mirror]} onScroll={onScroll} scrollEventThrottle={16}>
        {[0, 1, 2].map(page)}
      </ScrollView>
      <Box style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 }} gap="l" alignItems="center">
        <Box flexDirection="row" gap="s">
          {[0, 1, 2].map((k) => (
            <Pressable key={k} onPress={() => goTo(k)} hitSlop={8} accessibilityLabel={String(k + 1)}
              style={{ height: 8, width: k === i ? 24 : 8, borderRadius: 4, backgroundColor: k === i ? colors.primary : colors.grey300 }} />
          ))}
        </Box>
        <Button label={i === 2 ? t.start : t.next} onPress={() => (i < 2 ? goTo(i + 1) : done())} style={{ alignSelf: 'stretch' }} />
      </Box>
    </Screen>
  )
}

/** Asks for location permission; refusing (or "Not now") opens the map with the banner. */
export function LocationScreen({ navigation }: ScreenProps<'Location'>) {
  const { t } = useT()
  const setDenied = useStore((s) => s.setDenied)
  const toMap = (denied: boolean) => {
    setDenied(denied)
    navigation.reset({ index: 0, routes: [{ name: 'Tabs', params: { screen: 'Map' } }] })
  }
  const allow = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      toMap(status !== 'granted')
    } catch {
      toMap(false)
    }
  }
  return (
    <Screen>
      <Box flex={1} alignItems="center" justifyContent="center" gap="xl" style={{ paddingHorizontal: 32 }}>
        <View style={{ width: 260, height: 260, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 130, backgroundColor: colors.skyTint }} />
          <View style={{ position: 'absolute', top: 40, bottom: 40, left: 40, right: 40, borderRadius: 90, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.decorLine }} />
          <View style={{ position: 'absolute', top: 0, left: 0, width: 260, height: 260 }}><Bubbles items={LOC_BUB} /></View>
          <View style={{ width: 112, height: 112, borderRadius: 56, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 14, borderColor: 'rgba(11,59,143,.12)' }}>
            <Icon name="near_me" size={56} color="white" />
          </View>
        </View>
        <Box gap="sm">
          <Text w={800} fontSize={28} lh={1.3} align="center">{t.loc_t}</Text>
          <Text fontSize={16} color="grey600" lh={1.6} align="center">{t.loc_s}</Text>
        </Box>
      </Box>
      <Footer gap={8}>
        <Button label={t.allow} onPress={allow} />
        <Button label={t.not_now} variant="plain" onPress={() => toMap(true)} />
      </Footer>
    </Screen>
  )
}
