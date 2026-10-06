import { toast } from 'sonner'
import { T, type TKey } from '@/data/i18n-strings'
import { useStore } from '@/store'

/** Current language, its dictionary and direction-aware icon names. */
export function useT() {
  const L = useStore((s) => s.lang)
  const ar = L === 'ar'
  return {
    L,
    ar,
    t: T[L],
    dir: (ar ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
    /** Icons that must point the right way in RTL. */
    ic: { back: ar ? 'arrow_forward' : 'arrow_back', next: ar ? 'arrow_back' : 'arrow_forward', fwd: ar ? 'chevron_left' : 'chevron_right' },
  }
}

/** Shows a success toast in the current language. */
export function notify(key: TKey) {
  const L = useStore.getState().lang
  toast.success(T[L][key])
}
