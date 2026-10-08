// Demo data ported from the Claude Design prototype (raghwa-data.js).
import { addDays, mt, tm } from '@/lib/format'

export type Status = 'upcoming' | 'done' | 'cancelled'
export type BlockReason = 'holiday' | 'maintenance' | 'other'

export interface Service {
  id: string
  nameAr: string
  nameFr: string
  price: number
  descAr: string
  descFr: string
  active: boolean
}

export interface HistoryEntry {
  type: 'booked' | 'resched' | 'done' | 'cancelled'
  date: string
  time: string
  by?: 'customer' | 'garage'
  from?: string
}

export interface Reservation {
  id: string
  ref: string
  nameAr: string
  nameFr: string
  phone: string
  date: string
  time: string
  lines: { id: string; price: number }[]
  status: Status
  car: { brand: string; model: string; s: number; n: number } | null
  history: HistoryEntry[]
}

export interface DayHours {
  open: boolean
  from: string
  to: string
  brk: boolean
  bFrom: string
  bTo: string
}

export interface Notif {
  ar: string
  fr: string
  tAr: string
  tFr: string
  unread: boolean
  icon: string
}

/** The prototype is frozen on a fixed "now" so the demo always looks the same. */
export const TODAY = '2026-10-21'
export const NOW = '11:15'

export const SERVICES: Service[] = [
  { id: 'ext', nameAr: 'غسيل من برّا', nameFr: 'Lavage extérieur', price: 10, descAr: 'شامبوان، تشليل وتنشيف باليد', descFr: 'Shampoing, rinçage et séchage à la main', active: true },
  { id: 'int', nameAr: 'غسيل من داخل', nameFr: 'Lavage intérieur', price: 12, descAr: 'أسبيراتور، التابلو والبلّار', descFr: 'Aspiration, tableau de bord et vitres', active: true },
  { id: 'full', nameAr: 'غسيل كامل', nameFr: 'Lavage complet', price: 20, descAr: 'برّا وداخل، والجنط زادة', descFr: 'Extérieur + intérieur, jantes incluses', active: true },
  { id: 'polish', nameAr: 'تلميع', nameFr: 'Lustrage', price: 35, descAr: 'تلميع بالماكينة وحماية للدهن', descFr: 'Polissage machine et protection de la peinture', active: true },
  { id: 'engine', nameAr: 'تنظيف الموتور', nameFr: 'Nettoyage moteur', price: 15, descAr: 'تنظيف الموتور بالبخار', descFr: 'Nettoyage vapeur du compartiment moteur', active: true },
  { id: 'seats', nameAr: 'تنظيف الكراسي', nameFr: 'Nettoyage sièges', price: 40, descAr: 'شامبوان للكراسي بالعمق ونشفان', descFr: 'Shampoing en profondeur et séchage des sièges', active: false },
]

const PRICE: Record<string, number> = Object.fromEntries(SERVICES.map((s) => [s.id, s.price]))

type Car = [string, string, number, number] | null
type Extra = { by?: 'customer' | 'garage'; resched?: string }
type Row = [string, string, string, string, string, string[], Status, Car, Extra?]

// [nameAr, nameFr, phone, date, time, services, status, car, extra]
const R: Row[] = [
  ['أحمد بن صالح', 'Ahmed Ben Salah', '22345671', '2026-10-21', '08:00', ['full'], 'done', ['Volkswagen', 'Polo', 225, 6431]],
  ['إيناس الحمامي', 'Ines Hammami', '55102938', '2026-10-21', '08:30', ['ext'], 'done', ['Kia', 'Picanto', 241, 1187]],
  ['محمد علي الغربي', 'Mohamed Ali Gharbi', '98765432', '2026-10-21', '09:00', ['full', 'polish'], 'done', ['Mercedes', 'Classe C', 198, 7420]],
  ['سارة الجلاصي', 'Sarra Jlassi', '24681357', '2026-10-21', '09:00', ['int'], 'done', null],
  ['حمزة الشعباني', 'Hamza Chaabani', '50223344', '2026-10-21', '09:00', ['ext'], 'done', ['Renault', 'Clio', 233, 9015]],
  ['نور العياري', 'Nour Ayari', '93456120', '2026-10-21', '10:00', ['full'], 'done', ['Peugeot', '208', 247, 3302]],
  ['فارس المجري', 'Fares Mejri', '29871234', '2026-10-21', '10:00', ['ext'], 'cancelled', null, { by: 'customer' }],
  ['ياسمين الطرابلسي', 'Yasmine Trabelsi', '52789014', '2026-10-21', '11:00', ['full', 'engine'], 'upcoming', ['Hyundai', 'i20', 238, 5560]],
  ['وسيم البوعزيزي', 'Wassim Bouazizi', '97112233', '2026-10-21', '11:30', ['ext'], 'upcoming', ['Seat', 'Ibiza', 219, 8841]],
  ['رانية بن عمر', 'Rania Ben Amor', '21445566', '2026-10-21', '11:30', ['polish'], 'upcoming', ['Toyota', 'Yaris', 244, 1290], { resched: '15:00' }],
  ['أسامة الخليفي', 'Oussama Khelifi', '58990011', '2026-10-21', '11:30', ['full'], 'upcoming', null],
  ['أميرة الزواري', 'Amira Zouari', '26778899', '2026-10-21', '14:00', ['int', 'engine'], 'upcoming', ['Citroën', 'C3', 236, 4417]],
  ['سكندر بلحاج', 'Skander Belhadj', '99334455', '2026-10-21', '14:00', ['full'], 'upcoming', ['Volkswagen', 'Golf 8', 246, 2003]],
  ['مريم الدريدي', 'Mariem Dridi', '53221100', '2026-10-21', '16:30', ['ext'], 'upcoming', null],
  ['خليل السعيدي', 'Khalil Saidi', '20667788', '2026-10-21', '18:00', ['full'], 'upcoming', ['Dacia', 'Logan', 214, 6678]],
  ['عزيز منصور', 'Aziz Mansour', '94556677', '2026-10-22', '09:30', ['ext', 'int'], 'upcoming', ['Fiat', 'Tipo', 229, 3141]],
  ['هالة كراي', 'Hela Karray', '25889900', '2026-10-22', '10:00', ['polish'], 'upcoming', ['Audi', 'A3', 242, 7788], { resched: '16:00' }],
  ['بلال الجبالي', 'Bilel Jebali', '51123987', '2026-10-22', '15:00', ['full'], 'upcoming', null],
  ['سلمى الغرسلي', 'Salma Gharsalli', '92001122', '2026-10-23', '08:30', ['seats'], 'upcoming', ['Suzuki', 'Swift', 231, 5023]],
  ['مهدي الفرشيشي', 'Mehdi Ferchichi', '27443322', '2026-10-23', '17:00', ['full'], 'upcoming', ['Peugeot', '3008', 245, 9910]],
  ['يسرى بن يوسف', 'Yosra Ben Youssef', '56334411', '2026-10-24', '09:00', ['ext'], 'upcoming', null],
  ['أشرف الحامدي', 'Achref Hamdi', '98221144', '2026-10-24', '10:30', ['full', 'polish'], 'upcoming', ['BMW', 'Série 1', 240, 1456]],
  ['أنس المصمودي', 'Ons Masmoudi', '23119988', '2026-10-26', '11:00', ['int'], 'upcoming', ['Kia', 'Rio', 248, 2219]],
  ['أحمد بن صالح', 'Ahmed Ben Salah', '22345671', '2026-10-20', '10:00', ['full'], 'done', ['Volkswagen', 'Polo', 225, 6431]],
  ['سارة الجلاصي', 'Sarra Jlassi', '24681357', '2026-10-20', '15:30', ['ext'], 'cancelled', null, { by: 'garage' }],
  ['وسيم البوعزيزي', 'Wassim Bouazizi', '97112233', '2026-10-19', '09:00', ['engine', 'ext'], 'done', ['Seat', 'Ibiza', 219, 8841]],
  ['إيناس الحمامي', 'Ines Hammami', '55102938', '2026-10-19', '17:30', ['full'], 'done', ['Kia', 'Picanto', 241, 1187]],
  ['محمد علي الغربي', 'Mohamed Ali Gharbi', '98765432', '2026-10-17', '11:00', ['polish'], 'done', ['Mercedes', 'Classe C', 198, 7420]],
  ['نور العياري', 'Nour Ayari', '93456120', '2026-10-17', '12:00', ['int'], 'cancelled', null, { by: 'customer' }],
  ['ياسمين الطرابلسي', 'Yasmine Trabelsi', '52789014', '2026-10-16', '16:00', ['full'], 'done', ['Hyundai', 'i20', 238, 5560], { resched: '10:30' }],
]

const BT = ['19:42', '21:05', '08:17', '13:36', '22:48', '17:10', '10:24']

function buildReservations(rows: Row[], prefix: string, refBase: number): Reservation[] {
  return rows.map((r, i) => {
    const x = r[8] ?? {}
    const [nameAr, nameFr, phone, date, time, svc, status, car] = r
    const history: HistoryEntry[] = [{ type: 'booked', date: addDays(date, -(1 + (i % 3))), time: BT[i % BT.length] }]
    if (x.resched) history.push({ type: 'resched', date: addDays(date, -1), time: '09:12', from: x.resched })
    if (status === 'done') history.push({ type: 'done', date, time: mt(tm(time) + 40) })
    if (status === 'cancelled')
      history.push({ type: 'cancelled', by: x.by, date: x.by === 'garage' ? date : addDays(date, -1), time: x.by === 'garage' ? '09:30' : '18:55' })
    return {
      id: prefix + i,
      ref: 'RGW-' + (refBase - i * 3 + (i % 2)),
      nameAr, nameFr, phone, date, time,
      lines: svc.map((id) => ({ id, price: PRICE[id] })),
      status,
      car: car ? { brand: car[0], model: car[1], s: car[2], n: car[3] } : null,
      history,
    }
  })
}

export const RESERVATIONS: Reservation[] = buildReservations(R, 'r', 1187)

/** Monday → Sunday. Closed on Sunday, lunch break on weekdays. */
export const HOURS: DayHours[] = [0, 1, 2, 3, 4, 5, 6].map((i) => ({
  open: i < 6, from: '08:00', to: '19:00', brk: i < 5, bFrom: '13:00', bTo: '14:00',
}))

export const NOTIFS: Notif[] = [
  { ar: 'حجز جديد من أشرف الحامدي · السبت 10:30', fr: 'Nouvelle réservation : Achref Hamdi · sam. 10:30', tAr: 'قبل 5 دقايق', tFr: 'il y a 5 min', unread: true, icon: 'event_available' },
  { ar: 'هالة كراي بدّلت الموعد لغدوة 10:00', fr: 'Hela Karray a reporté à demain 10:00', tAr: 'قبل 40 دقيقة', tFr: 'il y a 40 min', unread: true, icon: 'update' },
  { ar: 'فارس المجري بطّل الحجز متاع اليوم 10:00', fr: 'Fares Mejri a annulé sa réservation de 10:00', tAr: 'البارح 18:55', tFr: 'hier, 18:55', unread: false, icon: 'event_busy' },
  { ar: 'ملخّص النهار: عندك 14 حجز اليوم', fr: 'Résumé du jour : 14 réservations aujourd’hui', tAr: 'اليوم 07:30', tFr: 'aujourd’hui, 07:30', unread: false, icon: 'summarize' },
]

/** Last 7 days of bookings; `null` = today (computed live). */
export const CHART: [string, number | null][] = [
  ['2026-10-15', 14], ['2026-10-16', 19], ['2026-10-17', 24], ['2026-10-18', 0], ['2026-10-19', 13], ['2026-10-20', 17], ['2026-10-21', null],
]
export const KPI = { doneBase: 151, revBase: 2890 }

export const GARAGE = {
  name: 'Raghwa Wash La Marsa',
  desc: 'غسيل باليد بمنتوجات ما تضرّش الدهن، قدّام شط المرسى. باركينغ للحرفاء وقهوة وانت تستنّى.',
  phone: '71 774 512',
  address: 'Avenue Habib Bourguiba',
  area: 'La Marsa',
  city: 'Tunis',
  lat: 36.8782,
  lng: 10.3247,
}
export type Garage = typeof GARAGE

export const OWNER = { ar: 'كريم المنصوري', fr: 'Karim Mansouri', firstAr: 'كريم', firstFr: 'Karim', phone: '98123456' }

export const BLOCKS: Record<string, BlockReason> = { '2026-10-27': 'holiday' }
export const SLOT_BLOCKS: Record<string, BlockReason> = {
  '2026-10-23|17:30': 'maintenance', '2026-10-23|18:00': 'maintenance', '2026-10-23|18:30': 'maintenance',
}

export const CITIES = [
  ['Tunis', 'تونس'], ['Ariana', 'أريانة'], ['Ben Arous', 'بن عروس'], ['La Manouba', 'منوبة'],
  ['Nabeul', 'نابل'], ['Sousse', 'سوسة'], ['Sfax', 'صفاقس'],
] as const

/* ───────────── Multi-garage demo ───────────── */

export interface GarageStats {
  /** Bookings before the tracked demo window, added to the live counts on the dashboard. */
  doneBase: number
  revBase: number
  chart: [string, number | null][]
}

export interface GarageSeed {
  id: string
  published: boolean
  garage: Garage
  hours: DayHours[]
  slotDur: number
  capacity: number
  services: Service[]
  reservations: Reservation[]
  notifs: Notif[]
  blocks: Record<string, BlockReason>
  slotBlocks: Record<string, BlockReason>
  uploads: Record<'logo' | 'p1' | 'p2' | 'p3', boolean>
  stats: GarageStats
}

const R_LAC: Row[] = [
  ['ليلى بن حسين', 'Leila Ben Hassine', '22110987', '2026-10-21', '09:00', ['full'], 'done', ['Renault', 'Mégane', 243, 2210]],
  ['طارق الورغي', 'Tarek Ouerghi', '98556677', '2026-10-21', '10:00', ['ext', 'int'], 'done', ['Toyota', 'Corolla', 239, 7781]],
  ['هيفاء الصيد', 'Haifa Essid', '55443322', '2026-10-21', '12:00', ['polish'], 'upcoming', ['BMW', 'X1', 247, 1102]],
  ['زياد الكعبي', 'Ziad Kaabi', '24990011', '2026-10-21', '15:00', ['full'], 'upcoming', null],
  ['منى الشريف', 'Mouna Cherif', '50778899', '2026-10-22', '09:30', ['int'], 'upcoming', ['Peugeot', '2008', 244, 3390]],
  ['كريم الدهماني', 'Karim Dhahmani', '93221100', '2026-10-23', '11:00', ['full', 'engine'], 'upcoming', ['Volkswagen', 'Tiguan', 246, 5512]],
  ['رحمة القاسمي', 'Rahma Kasmi', '27665544', '2026-10-20', '16:00', ['ext'], 'cancelled', null, { by: 'customer' }],
  ['نزار الهمامي', 'Nizar Hammami', '52334455', '2026-10-19', '10:30', ['full'], 'done', ['Kia', 'Sportage', 240, 8823]],
]

const defaultUploads = { logo: true, p1: true, p2: true, p3: false }

export const GARAGES: GarageSeed[] = [
  {
    id: 'g-marsa',
    published: true,
    garage: GARAGE,
    hours: HOURS,
    slotDur: 30,
    capacity: 3,
    services: SERVICES,
    reservations: RESERVATIONS,
    notifs: NOTIFS,
    blocks: BLOCKS,
    slotBlocks: SLOT_BLOCKS,
    uploads: defaultUploads,
    stats: { ...KPI, chart: CHART },
  },
  {
    id: 'g-lac',
    published: true,
    garage: {
      name: 'Raghwa Wash Lac 2',
      desc: 'غسيل سريع وتلميع في قلب البحيرة، باركينغ مغطّي.',
      phone: '71 960 233',
      address: 'Rue du Lac Biwa',
      area: 'Les Berges du Lac',
      city: 'Tunis',
      lat: 36.8372,
      lng: 10.2433,
    },
    hours: [0, 1, 2, 3, 4, 5, 6].map(() => ({ open: true, from: '09:00', to: '20:00', brk: false, bFrom: '13:00', bTo: '14:00' })),
    slotDur: 45,
    capacity: 2,
    services: SERVICES.map((s) => ({ ...s, price: Math.round(s.price * 1.2), active: s.id !== 'engine' })),
    reservations: buildReservations(R_LAC, 'l', 2412),
    notifs: [
      { ar: 'حجز جديد من كريم الدهماني · الخميس 11:00', fr: 'Nouvelle réservation : Karim Dhahmani · jeu. 11:00', tAr: 'قبل 20 دقيقة', tFr: 'il y a 20 min', unread: true, icon: 'event_available' },
      { ar: 'رحمة القاسمي بطّلت الحجز متاع البارح 16:00', fr: 'Rahma Kasmi a annulé sa réservation d’hier 16:00', tAr: 'البارح 18:55', tFr: 'hier, 18:55', unread: false, icon: 'event_busy' },
    ],
    blocks: {},
    slotBlocks: {},
    uploads: defaultUploads,
    stats: { doneBase: 64, revBase: 1340, chart: [['2026-10-15', 6], ['2026-10-16', 8], ['2026-10-17', 9], ['2026-10-18', 5], ['2026-10-19', 7], ['2026-10-20', 6], ['2026-10-21', null]] },
  },
  {
    id: 'g-sousse',
    published: false,
    garage: {
      name: 'Raghwa Wash Sousse',
      desc: '',
      phone: '73 225 140',
      address: '',
      area: '',
      city: 'Sousse',
      lat: 35.8256,
      lng: 10.6084,
    },
    hours: HOURS,
    slotDur: 30,
    capacity: 2,
    services: SERVICES,
    reservations: [],
    notifs: [],
    blocks: {},
    slotBlocks: {},
    uploads: { logo: false, p1: false, p2: false, p3: false },
    stats: { doneBase: 0, revBase: 0, chart: CHART.map(([d]) => [d, d === TODAY ? null : 0]) },
  },
]

/** Blank garage created from the garage picker; the owner fills it in through onboarding. */
export function newGarageSeed(id: string): GarageSeed {
  return {
    id,
    published: false,
    garage: { name: '', desc: '', phone: '', address: '', area: '', city: 'Tunis', lat: 36.8065, lng: 10.1815 },
    hours: HOURS,
    slotDur: 30,
    capacity: 2,
    services: SERVICES,
    reservations: [],
    notifs: [],
    blocks: {},
    slotBlocks: {},
    uploads: { logo: false, p1: false, p2: false, p3: false },
    stats: { doneBase: 0, revBase: 0, chart: CHART.map(([d]) => [d, d === TODAY ? null : 0]) },
  }
}
