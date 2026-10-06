import { useState, type ComponentProps, type ReactNode } from 'react'
import {
  ActivityIndicator, Modal, Pressable, TextInput, View, useWindowDimensions,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { createBox, createText } from '@shopify/restyle'
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, elevation, isDark, type Color, type Theme } from '@/theme'
import { useT } from '@/lib/i18n'
import { useToast } from '@/store'
import type { Bub } from '@/data/mock'

export const Box = createBox<Theme>()
const RText = createText<Theme>()

/* ───────────── Text ───────────── */

type Weight = 400 | 500 | 600 | 700 | 800
const FONTS = {
  ar: { 400: 'Cairo_400Regular', 500: 'Cairo_500Medium', 600: 'Cairo_600SemiBold', 700: 'Cairo_700Bold', 800: 'Cairo_800ExtraBold' },
  latin: { 400: 'Inter_400Regular', 500: 'Inter_500Medium', 600: 'Inter_600SemiBold', 700: 'Inter_700Bold', 800: 'Inter_800ExtraBold' },
} as const

type TextProps = ComponentProps<typeof RText> & {
  /** Font weight, mapped to the right Cairo/Inter file. */
  w?: Weight
  /** Force Inter (times, phone numbers, prices typed in digits). */
  latin?: boolean
  /** 'start' follows the reading direction. */
  align?: 'start' | 'center' | 'end'
  /** Line height as a multiple of the font size (Cairo gets +10% as in the style guide). */
  lh?: number
}

export function Text({ w = 400, latin, align = 'start', lh, style, fontSize, ...rest }: TextProps) {
  const { ar } = useT()
  const family = FONTS[ar && !latin ? 'ar' : 'latin'][w]
  const textAlign: TextStyle['textAlign'] = align === 'center' ? 'center' : (align === 'start') === ar ? 'right' : 'left'
  const size = typeof fontSize === 'number' ? fontSize : undefined
  const lineHeight = lh && size ? Math.round(size * lh * (ar && !latin ? 1.1 : 1)) : undefined
  return (
    <RText fontSize={fontSize} style={[{ fontFamily: family, textAlign, writingDirection: ar && !latin ? 'rtl' : 'ltr', lineHeight }, style]} {...rest} />
  )
}

/* ───────────── Icon ───────────── */

type IconName = ComponentProps<typeof MaterialIcons>['name']

/** Material icon by its Material Symbols name (e.g. "arrow_back"). `flip` mirrors directional icons in Arabic. */
export function Icon({ name, size = 24, color = 'ink', flip, style }: { name: string; size?: number; color?: Color; flip?: boolean; style?: StyleProp<TextStyle> }) {
  const { ar } = useT()
  return (
    <MaterialIcons name={name.replace(/_/g, '-') as IconName} size={size} color={colors[color]}
      style={[flip && ar ? { transform: [{ scaleX: -1 }] } : null, style]} />
  )
}

/* ───────────── Buttons ───────────── */

type Variant = 'primary' | 'secondary' | 'destructive' | 'destructiveSoft' | 'tertiary' | 'plain' | 'disabled'
/** Read at render time so the active theme's palette is used. */
const btn = (v: Variant): { bg: string; pressed: string; fg: Color } => ({
  primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: 'white' as Color },
  secondary: { bg: colors.grey100, pressed: colors.grey200, fg: 'ink' as Color },
  destructive: { bg: colors.negative, pressed: colors.negativeInk, fg: 'white' as Color },
  destructiveSoft: { bg: colors.negativeTint, pressed: colors.negativePressed, fg: 'negativeInk' as Color },
  tertiary: { bg: 'transparent', pressed: colors.grey100, fg: 'primary' as Color },
  plain: { bg: colors.bg, pressed: colors.grey100, fg: 'ink' as Color },
  disabled: { bg: colors.grey200, pressed: colors.grey200, fg: 'grey450' as Color },
})[v]

export function Button({ label, onPress, variant = 'primary', height = 56, icon, loading, disabled, flex, style, fontSize = 17, px }: {
  label: ReactNode; onPress?: () => void; variant?: Variant; height?: number; icon?: string; loading?: boolean; disabled?: boolean
  flex?: number; style?: StyleProp<ViewStyle>; fontSize?: number; px?: number
}) {
  const v = btn(disabled ? 'disabled' : variant)
  return (
    <Pressable onPress={disabled || loading ? undefined : onPress} accessibilityRole="button" accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={({ pressed }) => [{
        height, borderRadius: 999, flex, paddingHorizontal: px ?? 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: loading ? colors.primaryBusy : pressed ? v.pressed : v.bg, transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
      }, style]}>
      {loading ? <ActivityIndicator color="#fff" /> : icon ? <Icon name={icon} size={20} color={v.fg} /> : null}
      {typeof label === 'string' ? <Text w={700} fontSize={fontSize} color={v.fg} align="center" numberOfLines={1}>{label}</Text> : label}
    </Pressable>
  )
}

/** 44px round icon button (grey, or white with a shadow when floating over content). */
export function IconButton({ icon, onPress, size = 44, floating, flip, label, iconSize = 24, bg }: {
  icon: string; onPress?: () => void; size?: number; floating?: boolean; flip?: boolean; label?: string; iconSize?: number; bg?: string
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}
      style={({ pressed }) => [{
        width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
        backgroundColor: pressed ? colors.grey200 : bg ?? (floating ? colors.bg : colors.grey100),
      }, floating && elevation.float]}>
      <Icon name={icon} size={iconSize} flip={flip} />
    </Pressable>
  )
}

export function BackButton({ floating, onPress }: { floating?: boolean; onPress?: () => void }) {
  const nav = useNavigation()
  const { t } = useT()
  return <IconButton icon="arrow_back" flip floating={floating} label={t.continue} onPress={onPress ?? (() => nav.canGoBack() && nav.goBack())} />
}

/** Text-only link button. */
export function LinkButton({ label, onPress, underline, fontSize = 15 }: { label: string; onPress: () => void; underline?: boolean; fontSize?: number }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => ({ paddingVertical: 6, opacity: pressed ? 0.6 : 1 })}>
      <Text w={700} fontSize={fontSize} color="primary" style={underline ? { textDecorationLine: 'underline' } : undefined}>{label}</Text>
    </Pressable>
  )
}

/* ───────────── Inputs ───────────── */

export function FieldError({ children }: { children?: string | null }) {
  if (!children) return null
  return (
    <Box flexDirection="row" alignItems="center" gap="xs">
      <Icon name="error" size={16} color="negativeInk" />
      <Text w={600} fontSize={13} color="negativeInk">{children}</Text>
    </Box>
  )
}

export function Field({ label, error, children, hint }: { label: string; error?: string | null; children: ReactNode; hint?: string }) {
  return (
    <Box gap="s">
      <Text w={600} fontSize={14}>{label}</Text>
      {children}
      {hint ? <Text fontSize={13} color="grey600">{hint}</Text> : null}
      <FieldError>{error}</FieldError>
    </Box>
  )
}

/** Grey filled input shell: white with a blue border on focus, red border on error. */
function useShell(error?: boolean) {
  const [focus, setFocus] = useState(false)
  const shell: ViewStyle = {
    height: 56, borderRadius: 12, borderWidth: 2, flexDirection: 'row', alignItems: 'center',
    backgroundColor: focus ? colors.bg : colors.grey100,
    borderColor: error ? colors.negative : focus ? colors.primary : 'transparent',
  }
  return { shell, onFocus: () => setFocus(true), onBlur: () => setFocus(false) }
}

export function Input({ error, style, latin, ...rest }: TextInputProps & { error?: boolean; latin?: boolean }) {
  const { ar } = useT()
  const s = useShell(error)
  return (
    <View style={[s.shell, { paddingHorizontal: 16 }]}>
      <TextInput placeholderTextColor={colors.grey450} onFocus={s.onFocus} onBlur={s.onBlur}
        style={[{ flex: 1, height: '100%', fontSize: 16, color: colors.ink, fontFamily: ar && !latin ? 'Cairo_400Regular' : 'Inter_400Regular', textAlign: ar ? 'right' : 'left' }, style]}
        {...rest} />
    </View>
  )
}

export function PasswordInput({ error, show, onToggle, ...rest }: TextInputProps & { error?: boolean; show: boolean; onToggle: () => void }) {
  const { ar, t } = useT()
  const s = useShell(error)
  return (
    <View style={[s.shell, { paddingStart: 16, paddingEnd: 6 }]}>
      <TextInput secureTextEntry={!show} autoCapitalize="none" placeholderTextColor={colors.grey450} onFocus={s.onFocus} onBlur={s.onBlur}
        style={{ flex: 1, height: '100%', fontSize: 16, color: colors.ink, fontFamily: 'Inter_400Regular', textAlign: ar ? 'right' : 'left' }} {...rest} />
      <Pressable onPress={onToggle} accessibilityLabel={t.password} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={show ? 'visibility_off' : 'visibility'} size={22} color="grey600" />
      </Pressable>
    </View>
  )
}

/** Simplified Tunisian flag (red field, white disc, crescent). */
export function TnFlag() {
  return (
    <View style={{ width: 26, height: 18, borderRadius: 3, backgroundColor: '#E70013', overflow: 'hidden' }}>
      <View style={{ position: 'absolute', left: 8, top: 4, width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 9.5, top: 5.5, width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#E70013' }} />
      <View style={{ position: 'absolute', left: 11.5, top: 6, width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />
    </View>
  )
}

/** +216 phone field, always left-to-right. */
export function PhoneInput({ value, onChangeText, error }: { value: string; onChangeText: (v: string) => void; error?: boolean }) {
  const s = useShell(error)
  return (
    <View style={[s.shell, { direction: 'ltr', paddingHorizontal: 14, gap: 10 }]}>
      <TnFlag />
      <Text w={600} latin fontSize={16}>+216</Text>
      <View style={{ width: 1, height: 24, backgroundColor: colors.grey300 }} />
      <TextInput value={value} onChangeText={onChangeText} keyboardType="number-pad" placeholder="XX XXX XXX" placeholderTextColor={colors.grey450}
        onFocus={s.onFocus} onBlur={s.onBlur} autoComplete="tel" textContentType="telephoneNumber"
        style={{ flex: 1, height: '100%', fontSize: 16, color: colors.ink, fontFamily: 'Inter_400Regular', textAlign: 'left' }} />
    </View>
  )
}

/* ───────────── Small pieces ───────────── */

/** 52×32 switch from the style guide. */
export function Toggle({ value, onChange, label }: { value: boolean; onChange: () => void; label?: string }) {
  return (
    <Pressable onPress={onChange} accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityLabel={label}
      style={{ width: 52, height: 32, borderRadius: 16, backgroundColor: value ? colors.primary : colors.grey300, padding: 2, alignItems: value ? 'flex-end' : 'flex-start' }}>
      <View style={[{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff' }, elevation.pin]} />
    </Pressable>
  )
}

export function Chip({ label, on, onPress, icon, h = 40 }: { label: string; on: boolean; onPress: () => void; icon?: string; h?: number }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }}
      style={{ height: h, paddingHorizontal: 14, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: on ? colors.primary : colors.grey100 }}>
      {icon ? <Icon name={icon} size={icon === 'star' ? 16 : 18} color={on ? 'white' : 'ink'} /> : null}
      <Text w={600} fontSize={14} color={on ? 'white' : 'ink'}>{label}</Text>
    </Pressable>
  )
}

export function Segmented<K extends string>({ items, value, onChange }: { items: [K, string][]; value: K; onChange: (k: K) => void }) {
  return (
    <Box flexDirection="row" padding="xs" borderRadius="pill" backgroundColor="grey100" gap="xs">
      {items.map(([k, label]) => {
        const on = k === value
        return (
          <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={[{ flex: 1, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? (isDark() ? colors.grey300 : colors.bg) : 'transparent' }, on && elevation.pin, on && { shadowOpacity: 0.12 }]}>
            <Text w={on ? 700 : 500} fontSize={14} color={on ? 'ink' : 'grey600'} align="center">{label}</Text>
          </Pressable>
        )
      })}
    </Box>
  )
}

/** Tunisian plate: series · تونس · number (always RTL, as on real plates). */
export function Plate({ ps, pn, size = 'm' }: { ps: string; pn: string; size?: 's' | 'm' }) {
  const s = size === 's'
  return (
    <View style={{
      direction: 'rtl', flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: s ? 4 : 8,
      height: s ? undefined : 28, paddingHorizontal: s ? 6 : 10, paddingVertical: s ? 2 : 0, borderRadius: s ? 4 : 5, backgroundColor: colors.plate,
      borderWidth: s ? 0 : 1.5, borderColor: '#fff',
    }}>
      <Text latin w={700} fontSize={s ? 11 : 14} color="white">{ps}</Text>
      <Text w={700} fontSize={s ? 11 : 12} color="white" style={{ fontFamily: 'Cairo_700Bold' }}>تونس</Text>
      <Text latin w={700} fontSize={s ? 11 : 14} color="white">{pn}</Text>
    </View>
  )
}

export function Badge({ label, bg, fg, icon, size = 12 }: { label: string; bg: Color; fg: Color; icon?: string; size?: number }) {
  return (
    <Box flexDirection="row" alignItems="center" gap="xs" backgroundColor={bg} borderRadius="pill" style={{ paddingHorizontal: size > 12 ? 12 : 10, paddingVertical: size > 12 ? 6 : 4 }}>
      {icon ? <Icon name={icon} size={size + 2} color={fg} /> : null}
      <Text w={700} fontSize={size} color={fg}>{label}</Text>
    </Box>
  )
}

/** Garage photo placeholder (the design uses striped tiles). */
export function Thumb({ size, radius = 12, icon = 26 }: { size: number; radius?: number; icon?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: colors.thumb, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="local_car_wash" size={icon} color="thumbInk" />
    </View>
  )
}

export function Skeleton({ w, h, r = 4, c = 'grey150', style }: { w?: number | `${number}%`; h: number; r?: number; c?: Color; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ width: w, height: h, borderRadius: r, backgroundColor: colors[c] }, style]} />
}

/** Decorative foam bubbles positioned on the 390px-wide design frame, scaled to the screen. */
export function Bubbles({ items, white }: { items: Bub[]; white?: boolean }) {
  const { width } = useWindowDimensions()
  const k = width / 390
  // Pastel foam would glare on a dark page; tone it down there.
  const dim = !white && isDark() ? 0.22 : 1
  return (
    <>
      {items.map((b, i) => (
        <View key={i} pointerEvents="none" style={{
          position: 'absolute', left: b.x * k, top: b.y * k, width: b.s * k, height: b.s * k, borderRadius: (b.s * k) / 2,
          backgroundColor: white ? `rgba(255,255,255,${b.o})` : b.c, opacity: dim, borderWidth: white ? 1.5 : 0, borderColor: white ? `rgba(255,255,255,${b.bo})` : undefined,
        }} />
      ))}
    </>
  )
}

/** Raghwa drop: a square rotated 45° with three rounded corners. */
export function Drop({ size, color = colors.aqua, style }: { size: number; color?: string; style?: StyleProp<ViewStyle> }) {
  const r = size / 2
  return <View style={[{ width: size, height: size, backgroundColor: color, borderTopLeftRadius: 0, borderTopRightRadius: r, borderBottomLeftRadius: r, borderBottomRightRadius: r, transform: [{ rotate: '45deg' }] }, style]} />
}

/** The three-bubble Raghwa mark, drawn from garage-web/public/favicon.svg (64-unit grid: cx, cy, r, colour). */
const MARK: [number, number, number, string][] = [[26, 38, 14, '#22C3D6'], [42, 22, 8.5, '#FFFFFF'], [27, 18, 4.5, '#9FDCEA']]
/** Navy of the favicon tile (a shade darker than the UI brand navy). */
const MARK_TILE = '#0A2A66'

/**
 * Raghwa logo, identical to the web favicon. `tile` draws the rounded navy square behind the bubbles;
 * without it the bubbles are centred on their own bounds (for use on a navy background, e.g. the splash).
 */
export function LogoMark({ size = 64, tile }: { size?: number; tile?: boolean }) {
  // Bubble bounds on the 64 grid: x 12–50.5, y 13.5–52 (38.5 square, centre 31.25 / 32.75).
  const k = tile ? size / 64 : size / 38.5
  const ox = tile ? 0 : 12, oy = tile ? 0 : 13.5
  return (
    <View style={{ width: size, height: size, borderRadius: tile ? 16 * k : 0, backgroundColor: tile ? MARK_TILE : 'transparent' }}>
      {MARK.map(([cx, cy, r, c]) => (
        <View key={c} style={{ position: 'absolute', left: (cx - r - ox) * k, top: (cy - r - oy) * k, width: 2 * r * k, height: 2 * r * k, borderRadius: r * k, backgroundColor: c }} />
      ))}
    </View>
  )
}

/** App icon tile (same as the launcher icon / web favicon). */
export function LogoTile({ size = 64 }: { size?: number }) {
  return <LogoMark size={size} tile />
}

/** Row of icon + label + value (summary tables). */
export function InfoRow({ icon, label, value, last }: { icon: string; label: string; value: string; last?: boolean }) {
  return (
    <Box flexDirection="row" alignItems="center" gap="sm" style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.grey120 }}>
      <Icon name={icon} size={22} />
      <Text fontSize={14} color="grey600" style={{ flex: 1 }}>{label}</Text>
      <Text w={700} fontSize={15}>{value}</Text>
    </Box>
  )
}

export function Notice({ icon, children, tone = 'aqua', align = 'flex-start' }: { icon: string; children: ReactNode; tone?: 'aqua' | 'warning' | 'negative'; align?: 'flex-start' | 'center' }) {
  const c = { aqua: ['aquaTint', 'aquaInkDark'], warning: ['warningTint', 'warningInkDark'], negative: ['negativeTint', 'negativeInk'] }[tone] as [Color, Color]
  return (
    <Box flexDirection="row" gap="s" alignItems={align} backgroundColor={c[0]} borderRadius="input" style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
      <Icon name={icon} size={20} color={c[1]} />
      <Text w={600} fontSize={14} color={c[1]} lh={1.45} style={{ flex: 1 }}>{children}</Text>
    </Box>
  )
}

/* ───────────── Overlays ───────────── */

/**
 * Modal content renders in its own native root, so it must set `direction` itself.
 */
function Overlay({ visible, onClose, children, center }: { visible: boolean; onClose: () => void; children: ReactNode; center?: boolean }) {
  const { dir } = useT()
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={{ flex: 1, direction: dir, justifyContent: center ? 'center' : 'flex-end' }}>
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,.42)' }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="close" />
        </Animated.View>
        {children}
      </View>
    </Modal>
  )
}

export function Sheet({ visible, onClose, children, maxHeight }: { visible: boolean; onClose: () => void; children: ReactNode; maxHeight?: number }) {
  const insets = useSafeAreaInsets()
  return (
    <Overlay visible={visible} onClose={onClose}>
      <Animated.View entering={SlideInDown.duration(260)} exiting={SlideOutDown.duration(200)}
        style={{ backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Math.max(insets.bottom, 16) + 8, maxHeight }}>
        <Box alignItems="center" style={{ paddingTop: 10, paddingBottom: 4 }}><Box width={40} height={5} borderRadius="s" style={{ backgroundColor: colors.grey300 }} /></Box>
        {children}
      </Animated.View>
    </Overlay>
  )
}

export function Dialog({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <Overlay visible={visible} onClose={onClose} center>
      <Animated.View entering={FadeIn.duration(180)} style={[{ marginHorizontal: 24, backgroundColor: colors.bg, borderRadius: 24, padding: 24, gap: 12 }, elevation.sheet]}>
        {children}
      </Animated.View>
    </Overlay>
  )
}

/** Global toast (dark pill with an aqua check), shown above the tab bar. */
export function ToastHost({ bottom }: { bottom: number }) {
  const key = useToast((s) => s.key)
  const { t, dir } = useT()
  if (!key) return null
  return (
    <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(160)} pointerEvents="none"
      style={{ position: 'absolute', left: 16, right: 16, bottom, alignItems: 'center', zIndex: 70, direction: dir }}>
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.inverse }, elevation.sheet]}>
        <Icon name="check_circle" size={22} color="aqua" />
        <Text w={600} fontSize={15} color="white">{t[key]}</Text>
      </View>
    </Animated.View>
  )
}
