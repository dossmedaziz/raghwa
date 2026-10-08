import type { ReactNode } from 'react'
import { Pressable, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { colors } from '@/theme'
import { useT } from '@/lib/i18n'
import { BackButton, Box, Bubbles, Icon, Text } from '@/components/ui'
import { FOAM_A } from '@/data/constants'

/** Tab bar content height (without the home-indicator inset). */
export const TAB_H = 58

/** White page with safe-area padding; optional back header and foam corner (auth screens). */
export function Screen({ children, back, foam, bottom = true, header, bg = colors.bg }: {
  children: ReactNode; back?: boolean; foam?: boolean; bottom?: boolean; header?: ReactNode; bg?: string
}) {
  const insets = useSafeAreaInsets()
  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top, paddingBottom: bottom ? insets.bottom : 0, overflow: 'hidden' }}>
      {foam && <FoamCorner />}
      {back ? <Box flexDirection="row" alignItems="center" height={56} paddingHorizontal="m"><BackButton /></Box> : null}
      {header}
      {children}
    </View>
  )
}

/** Bubbles in the top "end" corner (mirrors with the reading direction). */
function FoamCorner() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, end: 0, width: 180, height: 180 }}>
      <Bubbles items={FOAM_A} />
    </View>
  )
}

/** Scrollable body with the design's 24px side padding by default. */
export function Body({ children, px = 24, gap = 24, pt = 16, pb = 24, style }: { children: ReactNode; px?: number; gap?: number; pt?: number; pb?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[{ paddingHorizontal: px, paddingTop: pt, paddingBottom: pb, gap }, style]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  )
}

/** Big page title + optional subtitle. */
export function Title({ title, sub, size = 32 }: { title: string; sub?: ReactNode; size?: number }) {
  return (
    <Box gap="s">
      <Text w={800} fontSize={size} lh={1.25}>{title}</Text>
      {sub ? <Text fontSize={16} color="grey600" lh={1.5}>{sub}</Text> : null}
    </Box>
  )
}

/** Footer with buttons, padded like the design (16/24 + safe area handled by Screen). */
export function Footer({ children, px = 24, gap = 16, center }: { children: ReactNode; px?: number; gap?: number; center?: boolean }) {
  return <View style={{ paddingHorizontal: px, paddingTop: 16, paddingBottom: 8, gap, alignItems: center ? 'center' : 'stretch' }}>{children}</View>
}

/** Sticky white bottom bar with a top border (booking + garage screens). */
export function BottomBar({ children, shadow }: { children: ReactNode; shadow?: boolean }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[{ backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.grey150, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) + 4, flexDirection: 'row', alignItems: 'center', gap: 16 },
      shadow && { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: -4 }, elevation: 8 }]}>
      {children}
    </View>
  )
}

/** Back button + two-line title (booking / reschedule header). */
export function NavHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <Box flexDirection="row" alignItems="center" gap="sm" height={60} paddingHorizontal="m">
      <BackButton />
      <Box flex={1} minWidth={0}>
        <Text w={800} fontSize={18}>{title}</Text>
        {sub ? <Text fontSize={13} color="grey600" numberOfLines={1}>{sub}</Text> : null}
      </Box>
    </Box>
  )
}

const TAB_ICON: Record<string, string> = { Map: 'map', Reservations: 'event_note', Profile: 'person' }

/** Bottom tab bar from the style guide (icons + labels, navy when active). */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const { t } = useT()
  const labels: Record<string, string> = { Map: t.map_tab, Reservations: t.res_tab, Profile: t.profile }
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.grey150, paddingTop: 6, paddingHorizontal: 8, paddingBottom: insets.bottom, height: TAB_H + insets.bottom }}>
      {state.routes.map((r, i) => {
        const on = state.index === i
        return (
          <Pressable key={r.key} accessibilityRole="tab" accessibilityState={{ selected: on }}
            onPress={() => { if (!on) navigation.navigate(r.name, r.params) }}
            style={{ flex: 1, alignItems: 'center', gap: 3, paddingTop: 4 }}>
            <Icon name={TAB_ICON[r.name]} size={26} color={on ? 'primary' : 'grey500'} />
            <Text w={on ? 700 : 500} fontSize={12} color={on ? 'primary' : 'grey500'} align="center">{labels[r.name]}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}
