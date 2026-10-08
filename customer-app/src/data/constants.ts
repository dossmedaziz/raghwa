// Static UI data: calendar names, fallback map centre and decorative bubbles.

export type Lang = 'ar' | 'fr'
/** [Derja, Français] */
export type L2 = [string, string]

export const TUNIS = { lat: 36.8065, lon: 10.1815 }

export const DOW = { ar: ['أحد', 'اثنين', 'ثلاثاء', 'إربعاء', 'خميس', 'جمعة', 'سبت'], fr: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'] }
export const DOWF = { ar: ['الأحد', 'الإثنين', 'الثلاثاء', 'الإربعاء', 'الخميس', 'الجمعة', 'السبت'], fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] }
export const MON = {
  ar: ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
}
export const MONS = { ar: MON.ar, fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'] }

/* Decorative bubbles (x, y, size in px on a 390-wide frame). */
type Bub = { x: number; y: number; s: number; c?: string; o?: number; bo?: number }
export const FOAM: Bub[] = [
  { x: -40, y: 610, s: 180, o: 0.06, bo: 0.12 }, { x: 120, y: 700, s: 90, o: 0.05, bo: 0.14 }, { x: 250, y: 640, s: 150, o: 0.07, bo: 0.12 },
  { x: 300, y: 560, s: 40, o: 0.1, bo: 0.2 }, { x: 60, y: 560, s: 24, o: 0.12, bo: 0.25 }, { x: 290, y: 90, s: 120, o: 0.04, bo: 0.1 },
  { x: 30, y: 140, s: 46, o: 0.05, bo: 0.14 }, { x: 200, y: 520, s: 16, o: 0.2, bo: 0.3 }, { x: 330, y: 760, s: 70, o: 0.06, bo: 0.14 },
]
export const FOAM_A: Bub[] = [{ x: 90, y: -30, s: 120, c: '#E4F8FA' }, { x: 60, y: 70, s: 44, c: '#EDF2FC' }, { x: 140, y: 100, s: 28, c: '#E4F8FA' }, { x: 40, y: 20, s: 16, c: '#CFF2F6' }]
export const FOAM_S: Bub[] = [
  { x: 40, y: 90, s: 60, c: '#E4F8FA' }, { x: 300, y: 70, s: 90, c: '#E4F8FA' }, { x: 260, y: 200, s: 26, c: '#CFF2F6' }, { x: 80, y: 220, s: 18, c: '#CFF2F6' },
  { x: 120, y: 60, s: 14, c: '#D3E3F6' }, { x: 330, y: 260, s: 12, c: '#D3E3F6' }, { x: 20, y: 300, s: 34, c: '#EDF2FC' },
]
export const INTRO_BUB: Bub[] = [{ x: 30, y: 40, s: 54, c: '#DDF3F7' }, { x: 70, y: 230, s: 30, c: '#D3E3F6' }, { x: 260, y: 230, s: 64, c: '#DDF3F7' }, { x: 290, y: 150, s: 18, c: '#BFE9F0' }, { x: 40, y: 140, s: 14, c: '#BFE9F0' }]
export const LOC_BUB: Bub[] = [{ x: 20, y: 40, s: 26, c: '#BFE9F0' }, { x: 214, y: 30, s: 18, c: '#D3E3F6' }, { x: 220, y: 200, s: 30, c: '#BFE9F0' }, { x: 10, y: 190, s: 14, c: '#D3E3F6' }]
export type { Bub }
