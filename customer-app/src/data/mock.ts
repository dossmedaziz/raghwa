// Demo data ported from the Claude Design prototype (RaghwaApp.dc.html).

export type Lang = 'ar' | 'fr'
/** [Derja, Français] */
export type L2 = [string, string]

export interface Service { id: string; n: L2; d: L2; p: number; dur: number }
export interface Garage {
  id: string; n: L2; ar: L2; a: L2; lat: number; lon: number; r: number; rc: number; d: number
  open: boolean; opens?: string; close: string; from: number; svc: string[]; tel?: string
}
export type ResStatus = 'up' | 'done' | 'cancelled'
/** `di` = day index relative to the demo "today" (negative = past), `m` = minutes since midnight. */
export interface Reservation { ref: string; g: string; di: number; m: number; svc: string[]; st: ResStatus; car: string; rating?: number }
export interface Car { id: string; b: string; m: string; ps: string; pn: string; def: boolean }

/** The prototype is frozen on Saturday 3 October 2026, 10:15, so the demo always looks the same. */
export const NOWM = 615
export const dayAt = (i: number) => new Date(2026, 9, 3 + i)

export const USER = { lat: 36.879, lon: 10.32 }
export const TUNIS = { lat: 36.8065, lon: 10.1815 }

export const DOW = { ar: ['أحد', 'اثنين', 'ثلاثاء', 'إربعاء', 'خميس', 'جمعة', 'سبت'], fr: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'] }
export const DOWF = { ar: ['الأحد', 'الإثنين', 'الثلاثاء', 'الإربعاء', 'الخميس', 'الجمعة', 'السبت'], fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] }
export const MON = {
  ar: ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
}
export const MONS = { ar: MON.ar, fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'] }

export const SV: Service[] = [
  { id: 'ext', n: ['غسيل من برّا', 'Lavage extérieur'], d: ['كاروسري، جانطات وبلّار', 'Carrosserie, jantes et vitres'], p: 10, dur: 20 },
  { id: 'int', n: ['غسيل من داخل', 'Lavage intérieur'], d: ['أسبيراتور، تابلو وبلّار من داخل', 'Aspiration, tableau de bord, vitres'], p: 12, dur: 25 },
  { id: 'full', n: ['غسيل كامل', 'Lavage complet'], d: ['برّا وداخل مع بعضهم', 'Extérieur + intérieur'], p: 20, dur: 40 },
  { id: 'pol', n: ['تلميع', 'Lustrage'], d: ['شمعة حماية ولمعة للكاروسري', 'Cire de protection et brillance'], p: 35, dur: 45 },
  { id: 'eng', n: ['تنظيف الموتور', 'Nettoyage moteur'], d: ['تنظيف بلوك الموتور من الزيت والغبرة', 'Dégraissage du bloc moteur'], p: 15, dur: 20 },
  { id: 'seat', n: ['تنظيف الكراسي', 'Nettoyage sièges'], d: ['شامبوان وتنشيف الكراسي', 'Shampooing et séchage des sièges'], p: 40, dur: 60 },
]
export const SVM: Record<string, Service> = Object.fromEntries(SV.map((x) => [x.id, x]))
const ALL = SV.map((x) => x.id)

export const G: Garage[] = [
  { id: 'marsa', n: ['رغوة واش المرسى', 'Raghwa Wash La Marsa'], ar: ['المرسى', 'La Marsa'], a: ['شارع الحبيب بورقيبة، المرسى', 'Avenue Habib Bourguiba, La Marsa'], lat: 36.8775, lon: 10.3305, r: 4.7, rc: 128, d: 1.2, open: true, close: '19:00', from: 10, svc: ALL, tel: '+216 71 774 210' },
  { id: 'plage', n: ['لافاج المرسى بلاج', 'Marsa Plage Lavage'], ar: ['المرسى', 'La Marsa'], a: ['نهج الطيب المهيري، المرسى', 'Rue Taïeb Mhiri, La Marsa'], lat: 36.8865, lon: 10.3245, r: 4.1, rc: 39, d: 1.8, open: false, opens: '14:00', close: '20:00', from: 10, svc: ['ext', 'int', 'full'] },
  { id: 'sbs', n: ['بُلّز سيدي بوسعيد', 'Bulles Sidi Bou Saïd'], ar: ['سيدي بوسعيد', 'Sidi Bou Saïd'], a: ['شارع الحبيب ثامر، سيدي بوسعيد', 'Rue Habib Thameur, Sidi Bou Saïd'], lat: 36.871, lon: 10.341, r: 4.5, rc: 86, d: 2.4, open: true, close: '18:00', from: 12, svc: ['ext', 'int', 'full', 'pol'] },
  { id: 'carthage', n: ['قرطاج كلين', 'Carthage Clean'], ar: ['قرطاج', 'Carthage'], a: ['شارع الجمهورية، قرطاج', 'Avenue de la République, Carthage'], lat: 36.854, lon: 10.326, r: 4.3, rc: 54, d: 3.1, open: true, close: '19:00', from: 10, svc: ALL },
  { id: 'lac2', n: ['لاك 2 أوتو سبا', 'Lac 2 Auto Spa'], ar: ['البحيرة 2', 'Les Berges du Lac 2'], a: ['نهج بحيرة توركانا، البحيرة 2', 'Rue du Lac Turkana, Lac 2'], lat: 36.843, lon: 10.272, r: 4.8, rc: 212, d: 4.6, open: true, close: '20:00', from: 15, svc: ALL },
  { id: 'lac1', n: ['لاك 1 إكسبراس', 'Lac 1 Express Wash'], ar: ['البحيرة 1', 'Les Berges du Lac 1'], a: ['نهج بحيرة ليمان، البحيرة 1', 'Rue du Lac Léman, Lac 1'], lat: 36.8335, lon: 10.2335, r: 4.2, rc: 71, d: 6.3, open: true, close: '19:00', from: 8, svc: ['ext', 'int', 'full', 'eng'] },
  { id: 'ennasr', n: ['النصر شاين', 'Ennasr Shine'], ar: ['النصر', 'Ennasr'], a: ['شارع الهادي نويرة، النصر 2', 'Avenue Hédi Nouira, Ennasr 2'], lat: 36.859, lon: 10.194, r: 4.4, rc: 97, d: 8.9, open: true, close: '21:00', from: 10, svc: ALL },
  { id: 'menzah', n: ['المنزه واش', 'Menzah Wash'], ar: ['المنزه 6', 'El Menzah 6'], a: ['شارع عثمان بن عفان، المنزه 6', 'Avenue Othman Ibn Affan, El Menzah 6'], lat: 36.847, lon: 10.183, r: 3.9, rc: 41, d: 9.4, open: false, opens: '15:00', close: '19:00', from: 9, svc: ['ext', 'int', 'full'] },
  { id: 'ariana', n: ['أريانة موس', 'Ariana Mousse'], ar: ['أريانة', 'Ariana'], a: ['شارع الحبيب بورقيبة، أريانة', 'Avenue Habib Bourguiba, Ariana'], lat: 36.8625, lon: 10.165, r: 4.6, rc: 150, d: 10.7, open: true, close: '19:00', from: 10, svc: ALL },
  { id: 'bardo', n: ['باردو كار كير', 'Bardo Car Care'], ar: ['باردو', 'Le Bardo'], a: ['شارع 20 مارس، باردو', 'Avenue du 20 Mars, Le Bardo'], lat: 36.809, lon: 10.134, r: 4.0, rc: 63, d: 14.2, open: true, close: '18:30', from: 8, svc: ['ext', 'int', 'full', 'eng'] },
]
export const gById = (id: string) => G.find((x) => x.id === id) ?? G[0]
/** Garage-specific price: the base price shifted by the garage's starting price. */
export const svcPrice = (g: Garage, id: string) => SVM[id].p + (g.from - 10)

export const REV: { n: L2; s: number; d: L2; x: L2 }[] = [
  { n: ['سامي ت.', 'Sami T.'], s: 5, d: ['منذ 3 أيام', 'il y a 3 jours'], x: ['خدمة نظيفة وفي الوقت، الكرهبة خرجت تلمع.', 'Travail soigné et ponctuel, la voiture brille.'] },
  { n: ['إيناس م.', 'Inès M.'], s: 4, d: ['منذ جمعة', 'il y a 1 semaine'], x: ['الجماعة لطاف، أما استنيت 10 دقايق زايدين.', 'Équipe sympa, mais 10 min d’attente en plus.'] },
  { n: ['كريم ب.', 'Karim B.'], s: 5, d: ['منذ جمعتين', 'il y a 2 semaines'], x: ['أحسن لافاج في المرسى، والسوم معقول.', 'Le meilleur lavage de La Marsa, prix correct.'] },
]

export const RES0: Reservation[] = [
  { ref: 'RG-24702', g: 'lac2', di: 0, m: 690, svc: ['ext'], st: 'up', car: 'polo' },
  { ref: 'RG-24655', g: 'marsa', di: 5, m: 960, svc: ['full', 'pol'], st: 'up', car: 'polo' },
  { ref: 'RG-23961', g: 'sbs', di: -14, m: 570, svc: ['full'], st: 'done', rating: 0, car: 'polo' },
  { ref: 'RG-23502', g: 'carthage', di: -35, m: 660, svc: ['ext', 'int'], st: 'done', rating: 5, car: 'polo' },
  { ref: 'RG-24105', g: 'ennasr', di: -9, m: 1050, svc: ['int'], st: 'cancelled', car: 'polo' },
]

export const CARS0: Car[] = [
  { id: 'polo', b: 'Volkswagen', m: 'Polo', ps: '215', pn: '4521', def: true },
  { id: 'picanto', b: 'Kia', m: 'Picanto', ps: '231', pn: '1087', def: false },
]

/** Fake places left for a slot: -1 past, 0 full, 1..3 places. Deterministic so the demo is stable. */
export const avail = (gid: string, di: number, m: number) => {
  if (di === 0 && m <= NOWM) return -1
  const h = (di * 7 + (m / 30) * 13 + gid.charCodeAt(0)) % 10
  return h < 2 ? 0 : h < 4 ? 1 : h < 6 ? 2 : 3
}

export const USER_PHONE = '22 345 678'
export const DEMO_OTP = '1234'

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
