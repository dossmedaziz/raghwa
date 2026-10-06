import { useCallback, useEffect, useRef } from 'react'
import { BackHandler } from 'react-native'
import { BottomSheetBackdrop, type BottomSheetBackdropProps, type BottomSheetModal } from '@gorhom/bottom-sheet'
import { colors } from '@/theme'

/**
 * Drives a gorhom `BottomSheetModal` from a `visible` flag, like a regular modal:
 * presents/dismisses it, dims the page behind it, and closes on Android back.
 * Spread `props` onto the modal.
 */
export function useSheetModal(visible: boolean, onClose: () => void) {
  const ref = useRef<BottomSheetModal>(null)
  useEffect(() => {
    if (visible) ref.current?.present()
    else ref.current?.dismiss()
  }, [visible])
  useEffect(() => {
    if (!visible) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true })
    return () => sub.remove()
  }, [visible, onClose])
  const backdropComponent = useCallback(
    (p: BottomSheetBackdropProps) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.42} />, [],
  )
  return {
    ref,
    props: {
      onDismiss: onClose,
      backdropComponent,
      backgroundStyle: { backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderRadius: 0 },
      handleIndicatorStyle: { width: 40, height: 5, backgroundColor: colors.grey300 },
    },
  }
}
