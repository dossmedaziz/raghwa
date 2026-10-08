import { useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Field, FieldError, Icon, SuffixInput } from '@/components/common'
import { CITIES, DEFAULT_POSITION } from '@/data/cities'
import { notifyError } from '@/lib/errors'
import type { Service } from '@/lib/types'
import { DAYS } from '@/data/i18n-strings'
import { cn } from '@/lib/utils'
import { currency, fx, genSlots, money } from '@/lib/format'
import { notify, useT } from '@/lib/i18n'
import { useSlotDuration, useStore, type UploadKey } from '@/store'

/* ───────────── Working hours ───────────── */

function TimeInput({ value, onChange, small }: { value: string; onChange: (v: string) => void; small?: boolean }) {
  return (
    <input type="time" value={value} onChange={(e) => onChange(e.target.value)}
      className={cn('rounded-[10px] border-[1.5px] border-input bg-white font-latin focus:border-primary focus:ring-3 focus:ring-ring/30 focus:outline-none',
        small ? 'rounded-lg border px-2 py-1 text-[13px]' : 'px-2.5 py-[7px] text-sm')} />
  )
}

export function HoursEditor({ dense }: { dense?: boolean }) {
  const { t, L } = useT()
  const hours = useStore((s) => s.hours), setHour = useStore((s) => s.setHour)
  return (
    <div className="flex flex-col">
      {hours.map((h, i) => (
        <div key={i} className={cn('flex flex-wrap items-center gap-x-[18px] gap-y-3 border-b border-line px-0.5', dense ? 'py-[11px]' : 'py-3.5')}>
          <div className={cn('flex items-center gap-3', dense ? 'w-[190px]' : 'w-[200px]')}>
            <Switch checked={h.open} onCheckedChange={(open) => setHour(i, { open })} aria-label={DAYS[L][i]} />
            <span className={cn('flex-1 font-bold', !dense && 'text-[15px]')}>{DAYS[L][i]}</span>
            <span className={cn('text-[12.5px] font-semibold', h.open ? 'text-success' : 'text-subtle')}>{h.open ? t.open : t.closed}</span>
          </div>
          {h.open ? (
            <>
              <div dir="ltr" className="flex items-center gap-2">
                <TimeInput value={h.from} onChange={(from) => setHour(i, { from })} />
                <span className="text-subtle">–</span>
                <TimeInput value={h.to} onChange={(to) => setHour(i, { to })} />
              </div>
              {h.brk ? (
                <div className="flex items-center gap-2 rounded-xl bg-muted py-1 ps-3 pe-1.5">
                  {!dense && <Icon name="local_cafe" size={18} className="text-muted-foreground" />}
                  <span className="text-[13px] font-semibold text-ink-2">{t.break}</span>
                  <div dir="ltr" className="flex items-center gap-1.5">
                    <TimeInput small value={h.bFrom} onChange={(bFrom) => setHour(i, { bFrom })} />
                    <span className="text-subtle">–</span>
                    <TimeInput small value={h.bTo} onChange={(bTo) => setHour(i, { bTo })} />
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => setHour(i, { brk: false })} aria-label={t.remove} className="text-muted-foreground">
                    <Icon name="close" size={18} />
                  </Button>
                </div>
              ) : (
                <button type="button" onClick={() => setHour(i, { brk: true })} className="flex items-center gap-1.5 px-1 py-1.5 text-[13.5px] font-semibold text-primary">
                  <Icon name="add" size={18} />{t.addBreak}
                </button>
              )}
            </>
          ) : (
            <span className="text-[13.5px] text-subtle">{t.closedAllDay}</span>
          )}
        </div>
      ))}
    </div>
  )
}

export function CopyHoursButton() {
  const { t } = useT()
  const copy = useStore((s) => s.copyHoursToAll)
  return (
    <Button variant="outline" size="sm" className="text-primary" onClick={() => { copy(); notify('toastCopied') }}>
      <Icon name="content_copy" size={18} />{t.copyAll}
    </Button>
  )
}

/* ───────────── Slot duration + capacity ───────────── */

const chip = (on: boolean) => cn('rounded-xl border-[1.5px] px-3.5 py-2.5 text-sm font-bold transition-colors', on ? 'border-primary bg-primary text-white' : 'border-input bg-white text-foreground hover:border-primary')

export function SlotDurationPicker({ inline, error }: { inline?: boolean; error?: boolean }) {
  const { t } = useT()
  const { slotDur, isCustom, customDur, setSlotDur, setCustom, setCustomDur } = useStore()
  const custom = (
    <SuffixInput value={customDur} onChange={setCustomDur} suffix={t.minutes} placeholder={t.customPh} invalid={error} aria-label={t.custom}
      className={inline ? 'w-[130px]' : 'max-w-[220px]'} />
  )
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-2">
        {[15, 30, 45, 60].map((m) => {
          const on = !isCustom && slotDur === m
          return <button key={m} type="button" aria-pressed={on} onClick={() => setSlotDur(m)} className={cn(chip(on), 'min-w-[76px]')}>{m} {t.minutes}</button>
        })}
        <button type="button" aria-pressed={isCustom} onClick={setCustom} className={chip(isCustom)}>{t.custom}</button>
        {isCustom && inline && custom}
      </div>
      {isCustom && !inline && (
        <div className="flex flex-col gap-1.5">
          {custom}
          <FieldError>{error ? t.errDur : null}</FieldError>
        </div>
      )}
    </div>
  )
}

export function CapacityStepper() {
  const capacity = useStore((s) => s.capacity), setCapacity = useStore((s) => s.setCapacity)
  const btn = 'flex size-12 items-center justify-center bg-muted text-primary hover:bg-[#E8EEF6]'
  return (
    <div dir="ltr" className="flex w-max items-center overflow-hidden rounded-[14px] border-[1.5px] border-input bg-white">
      <button type="button" aria-label="-" onClick={() => setCapacity(capacity - 1)} className={btn}><Icon name="remove" size={22} /></button>
      <span className="w-16 text-center font-latin text-[22px] font-bold" aria-live="polite">{capacity}</span>
      <button type="button" aria-label="+" onClick={() => setCapacity(capacity + 1)} className={btn}><Icon name="add" size={22} /></button>
    </div>
  )
}

/** Generated slots for the first open day + per-day totals. */
export function useSlotPreview() {
  const { t, L } = useT()
  const hours = useStore((s) => s.hours), cap = useStore((s) => s.capacity)
  const dur = useSlotDuration()
  const idx = Math.max(0, hours.findIndex((h) => h.open))
  const slots = genSlots(hours[idx], dur)
  return {
    slots, dur, cap,
    title: fx(t.previewFor, { d: DAYS[L][idx] }),
    pvSlots: fx(t.slotsPerDay, { n: slots.length }),
    pvCars: fx(t.carsPerSlot, { n: cap }),
    pvPlaces: fx(t.placesPerDay, { n: slots.length * cap }),
  }
}

export function SlotStats() {
  const p = useSlotPreview()
  return (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full bg-blue-wash px-2.5 py-1 text-[13px] font-bold text-primary">{p.pvSlots}</span>
      <span className="rounded-full bg-cyan-wash px-2.5 py-1 text-[13px] font-bold text-teal-ink">{p.pvCars}</span>
      <span className="rounded-full bg-secondary px-2.5 py-1 text-[13px] font-bold text-ink-2">{p.pvPlaces}</span>
    </div>
  )
}

/* ───────────── Services ───────────── */

export function useServiceRows() {
  const { ar, L, t } = useT()
  const services = useStore((s) => s.services), toggleService = useStore((s) => s.toggleService)
  const active = services.filter((x) => x.active)
  return {
    services,
    active,
    /** Switches a service on/off through the API (a published garage must keep one active). */
    toggle: (id: string) => { toggleService(id).catch(notifyError) },
    countLabel: fx(t.svcCount, { n: active.length, m: services.length }),
    label: (sv: Service) => ({ name: ar ? sv.nameAr : sv.nameFr, other: ar ? sv.nameFr : sv.nameAr, desc: ar ? sv.descAr : sv.descFr, price: money(sv.price, L) }),
  }
}

/** Shared add/edit/delete flow for services (dialog + confirm). */
export function useServiceEditor() {
  const [editing, setEditing] = useState<Service | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<Service | null>(null)
  return {
    openNew: () => setEditing(null),
    openEdit: (sv: Service) => setEditing(sv),
    askDelete: (sv: Service) => setDeleting(sv),
    dialogs: (
      <>
        <Dialog open={editing !== undefined} onOpenChange={(o) => !o && setEditing(undefined)}>
          {editing !== undefined && <ServiceDialog key={editing?.id ?? 'new'} service={editing} onClose={() => setEditing(undefined)} />}
        </Dialog>
        <DeleteServiceDialog service={deleting} onClose={() => setDeleting(null)} />
      </>
    ),
  }
}

type SvcForm = { nameAr: string; nameFr: string; price: string; descAr: string; descFr: string; active: boolean }
const emptySvc: SvcForm = { nameAr: '', nameFr: '', price: '', descAr: '', descFr: '', active: true }

/** `service`: null = new, Service = edit. Mounted fresh each time the dialog opens. */
function ServiceDialog({ service, onClose }: { service: Service | null; onClose: () => void }) {
  const { t, L } = useT()
  const save = useStore((s) => s.saveService)
  const [f, setF] = useState<SvcForm>(service ? { ...service, price: String(service.price) } : emptySvc)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<Partial<Record<'nameAr' | 'nameFr' | 'price', string>>>({})
  const up = (k: keyof SvcForm, v: string | boolean) => { setF((x) => ({ ...x, [k]: v })); setErr((e) => ({ ...e, [k]: undefined })) }
  const submit = () => {
    const e: typeof err = {}
    if (!f.nameAr.trim()) e.nameAr = t.errRequired
    if (!f.nameFr.trim()) e.nameFr = t.errRequired
    if (!(+f.price > 0)) e.price = t.errPrice
    setErr(e)
    if (Object.keys(e).length) return
    setBusy(true)
    save(service?.id ?? null, { nameAr: f.nameAr.trim(), nameFr: f.nameFr.trim(), price: +f.price, descAr: f.descAr.trim(), descFr: f.descFr.trim(), active: f.active })
      .then(() => { notify('toastSvcSaved'); onClose() }, notifyError)
      .finally(() => setBusy(false))
  }
  return (
      <DialogContent className="gap-0 overflow-hidden rounded-[20px] p-0 shadow-modal sm:max-w-[560px]">
        <DialogHeader className="border-b border-line px-[22px] py-[18px]">
          <DialogTitle className="text-[17px] font-bold">{service ? t.editService : t.newService}</DialogTitle>
        </DialogHeader>
        <div className="flex max-h-[calc(100vh-200px)] flex-col gap-4 overflow-y-auto px-[22px] py-5">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field id="sm-ar" label={t.nameAr} error={err.nameAr}>
              <Input id="sm-ar" dir="rtl" className="font-arabic" value={f.nameAr} aria-invalid={!!err.nameAr || undefined} onChange={(e) => up('nameAr', e.target.value)} />
            </Field>
            <Field id="sm-fr" label={t.nameFr} error={err.nameFr}>
              <Input id="sm-fr" dir="ltr" className="font-latin" value={f.nameFr} aria-invalid={!!err.nameFr || undefined} onChange={(e) => up('nameFr', e.target.value)} />
            </Field>
          </div>
          <Field id="sm-price" label={t.price} error={err.price} className="max-w-[240px]">
            <SuffixInput id="sm-price" value={f.price} suffix={currency(L)} invalid={!!err.price} onChange={(v) => up('price', v.replace(/\D/g, '').slice(0, 4))} />
          </Field>
          <Field id="sm-dar" label={t.descAr}>
            <Input id="sm-dar" dir="rtl" className="font-arabic text-[14.5px]" value={f.descAr} onChange={(e) => up('descAr', e.target.value)} />
          </Field>
          <Field id="sm-dfr" label={t.descFr}>
            <Input id="sm-dfr" dir="ltr" className="font-latin text-[14.5px]" value={f.descFr} onChange={(e) => up('descFr', e.target.value)} />
          </Field>
          <label className="flex items-center gap-3 rounded-xl bg-muted px-3.5 py-3">
            <Switch checked={f.active} onCheckedChange={(v) => up('active', v)} aria-label={t.active} />
            <span className="font-semibold">{f.active ? t.active : t.inactive}</span>
          </label>
        </div>
        <DialogFooter className="mx-0 mb-0 border-0 bg-transparent px-[22px] pt-3.5 pb-5">
          <Button variant="outline" onClick={onClose}>{t.cancel}</Button>
          <Button disabled={busy} onClick={submit}>{t.save}</Button>
        </DialogFooter>
      </DialogContent>
  )
}

function DeleteServiceDialog({ service, onClose }: { service: Service | null; onClose: () => void }) {
  const { t } = useT()
  const del = useStore((s) => s.deleteService)
  return (
    <ConfirmDialog open={!!service} onClose={onClose} icon="delete" title={t.delSvcTitle} body={t.delSvcBody} yes={t.confirmDelete} no={t.keep}
      onYes={() => { if (service) del(service.id).then(() => notify('toastSvcDeleted'), notifyError) }} />
  )
}

/** Red confirmation dialog used for destructive actions. */
export function ConfirmDialog({ open, onClose, onYes, icon, title, body, yes, no }: {
  open: boolean; onClose: () => void; onYes: () => void; icon: string; title: string; body: string; yes: string; no: string
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="gap-3 rounded-[20px] p-6 shadow-modal data-[size=default]:max-w-[420px] data-[size=default]:sm:max-w-[420px]">
        <AlertDialogHeader className="place-items-start gap-3 text-start">
          <span className="flex size-12 items-center justify-center rounded-[14px] bg-danger-soft text-destructive"><Icon name={icon} size={26} /></span>
          <AlertDialogTitle className="text-lg font-bold">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed text-ink-2">{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mx-0 mb-0 mt-2 border-0 bg-transparent p-0">
          <AlertDialogCancel>{no}</AlertDialogCancel>
          <AlertDialogAction onClick={() => { onYes(); onClose() }} className="bg-destructive text-white hover:bg-[#A5262E]">{yes}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/* ───────────── Photos ───────────── */

export function PhotoSlots({ hint }: { hint?: boolean }) {
  const { t } = useT()
  const uploads = useStore((s) => s.uploads), setUpload = useStore((s) => s.setUpload)
  const slots: [UploadKey, string, string, number][] = [
    ['logo', t.logo, 'logo.png', 120], ['p1', t.photos + ' 1', 'facade.jpg', 170], ['p2', t.photos + ' 2', 'station-1.jpg', 170], ['p3', t.photos + ' 3', 'station-2.jpg', 170],
  ]
  return (
    <div className="flex flex-wrap gap-3.5">
      {slots.map(([k, label, file, w]) => (
        <div key={k} className="relative h-[120px] overflow-hidden rounded-[14px]" style={{ width: w }}>
          {uploads[k] ? (
            <>
              <div className="bg-photo flex size-full flex-col items-center justify-center gap-1 rounded-[14px] border border-input">
                <span className="font-mono text-[11px] text-muted-foreground">{file}</span>
                <span className="text-[11.5px] font-semibold text-ink-2">{label}</span>
              </div>
              <button type="button" onClick={() => setUpload(k, false)} aria-label={t.remove}
                className="absolute end-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-[rgba(11,27,58,.7)] text-white">
                <Icon name="close" size={16} />
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setUpload(k, true)}
              className="flex size-full flex-col items-center justify-center gap-1 rounded-[14px] border-[1.5px] border-dashed border-[#B9C6D8] bg-[#FAFCFE] text-ink-2 hover:border-primary hover:bg-[#F2F7FD]">
              <Icon name="add_photo_alternate" size={24} className="text-primary" />
              <span className="text-[12.5px] font-semibold">{k === 'logo' ? t.logo : t.addImage}</span>
              {hint && <span className="text-[11px] text-muted-foreground">{t.uploadHint}</span>}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

/* ───────────── Location ───────────── */

const pinIcon = L.divIcon({
  className: '',
  iconSize: [36, 44],
  iconAnchor: [18, 40],
  html: '<div style="position:relative;width:36px;height:44px"><div style="position:absolute;top:0;left:2px;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#0E3B8C;border:3px solid #fff;box-shadow:0 4px 12px rgba(11,27,58,.35)"></div><div style="position:absolute;top:11px;left:13px;width:10px;height:10px;border-radius:50%;background:#22C3D6"></div></div>',
})

function ClickToMove({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

export const coordsLabel = (lat: number | null, lng: number | null) => (lat === null || lng === null ? '—' : lat.toFixed(4) + ', ' + lng.toFixed(4))

/** Draggable garage pin on Carto/OpenStreetMap tiles. */
export function LocationMap({ height = 360 }: { height?: number }) {
  const g = useStore((s) => s.garage), update = useStore((s) => s.updateGarage)
  // A new garage has no pin yet: show it at the default position until the owner moves it.
  const lat = g.lat ?? DEFAULT_POSITION.lat, lng = g.lng ?? DEFAULT_POSITION.lng
  const pick = (a: number, b: number) => update({ lat: +a.toFixed(5), lng: +b.toFixed(5) })
  return (
    <div className="relative overflow-hidden rounded-[14px] border border-input">
      <div dir="ltr" style={{ height }} className="w-full bg-[#E8EEF4]">
        {/* MapContainer only reads `center` on mount; the marker follows the store. */}
        <MapContainer center={[lat, lng]} zoom={16} scrollWheelZoom={false} className="size-full">
          {/* Free OpenStreetMap tiles (CARTO, used in the prototype, now needs an API key). */}
          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
          <Marker position={[lat, lng]} icon={pinIcon} draggable
            eventHandlers={{ dragend: (e) => { const p = (e.target as L.Marker).getLatLng(); pick(p.lat, p.lng) } }} />
          <ClickToMove onPick={pick} />
        </MapContainer>
      </div>
      <div dir="ltr" className="absolute bottom-2.5 left-2.5 z-[500] rounded-lg bg-white px-2.5 py-1.5 font-latin text-xs text-ink-2 shadow-[0_2px_8px_rgba(11,27,58,.15)]">
        {coordsLabel(lat, lng)}
      </div>
    </div>
  )
}

export function CitySelect({ id }: { id?: string }) {
  const city = useStore((s) => s.garage.city), update = useStore((s) => s.updateGarage)
  return (
    <Select value={city} onValueChange={(v) => update({ city: v })}>
      <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent>
        {CITIES.map(([fr, ar]) => <SelectItem key={fr} value={fr}>{fr} · {ar}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}
