import * as React from 'react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { useStore } from '@/store'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Status } from '@/data/mock'

/** Material Symbols Rounded glyph (the design's icon set). */
export function Icon({ name, size = 20, fill, className, style }: { name: string; size?: number; fill?: boolean; className?: string; style?: React.CSSProperties }) {
  return (
    <span aria-hidden className={cn('ms', className)} style={{ fontSize: size, fontVariationSettings: fill ? "'FILL' 1" : undefined, ...style }}>
      {name}
    </span>
  )
}

/** The three-bubble Raghwa mark. `tone` sets the top-right bubble colour. */
export function LogoMark({ size = 32, tone = 'brand', dot = false }: { size?: number; tone?: 'brand' | 'white'; dot?: boolean }) {
  const big = Math.round(size * 0.68), small = Math.round(size * 0.41)
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <span className="absolute bottom-0 start-0 rounded-full bg-aqua" style={{ width: big, height: big }} />
      <span className={cn('absolute end-0 top-[2px] rounded-full', tone === 'white' ? 'bg-white' : 'bg-primary')} style={{ width: small, height: small }} />
      {dot && <span className="absolute top-0 start-[15%] rounded-full bg-aqua-soft" style={{ width: size * 0.21, height: size * 0.21 }} />}
    </div>
  )
}

export function LangSwitch({ compact }: { compact?: boolean }) {
  const lang = useStore((s) => s.lang), setLang = useStore((s) => s.setLang)
  const btn = (on: boolean) =>
    cn('rounded-full border-0 py-1.5 text-[13px] font-semibold transition-colors', compact ? 'px-3' : 'px-3.5', on ? 'bg-primary text-white' : 'bg-transparent text-ink-2 hover:text-primary')
  return (
    <div role="group" aria-label="Langue / اللغة" className="flex gap-0.5 rounded-full bg-secondary p-[3px]">
      <button type="button" onClick={() => setLang('ar')} className={cn(btn(lang === 'ar'), 'font-arabic')}>عربي</button>
      <button type="button" onClick={() => setLang('fr')} className={cn(btn(lang === 'fr'), 'font-latin')}>Français</button>
    </div>
  )
}

export function FieldError({ children, center }: { children?: React.ReactNode; center?: boolean }) {
  if (!children) return null
  return (
    <span role="alert" className={cn('flex items-center gap-1.5 text-[12.5px] font-medium text-destructive', center && 'justify-center')}>
      <Icon name="error" size={16} />
      {children}
    </span>
  )
}

/** Label + control + error/hint, as used across every form in the design. */
export function Field({ id, label, error, hint, children, className, labelExtra }: {
  id?: string; label: React.ReactNode; error?: string | null; hint?: string; children: React.ReactNode; className?: string; labelExtra?: React.ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-[13px] font-semibold text-ink-2">{label}</Label>
        {labelExtra}
      </div>
      {children}
      {error ? <FieldError>{error}</FieldError> : hint ? <span className="text-[12.5px] text-muted-foreground">{hint}</span> : null}
    </div>
  )
}

/** Field wrapper whose border reacts to focus/error (prefix or suffix inside). */
export function InputGroup({ invalid, className, children, ...rest }: React.ComponentProps<'div'> & { invalid?: boolean }) {
  return (
    <div
      {...rest}
      className={cn(
        'flex items-stretch overflow-hidden rounded-xl border-[1.5px] bg-white transition-shadow focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/30',
        invalid ? 'border-destructive' : 'border-input',
        className,
      )}
    >
      {children}
    </div>
  )
}

const bareInput = 'h-11 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-0'

/** +216 phone field; always LTR. Value is kept formatted as "XX XXX XXX". */
export function PhoneInput({ id, value, onChange, invalid, placeholder = 'XX XXX XXX', autoComplete }: {
  id?: string; value: string; onChange: (v: string) => void; invalid?: boolean; placeholder?: string; autoComplete?: string
}) {
  return (
    <InputGroup invalid={invalid} dir="ltr">
      <span className="flex items-center border-e border-border bg-field px-3 font-latin text-[15px] font-semibold text-ink-2">+216</span>
      <Input
        id={id}
        inputMode="numeric"
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
        className={cn(bareInput, 'font-latin tracking-[.03em]')}
      />
    </InputGroup>
  )
}

export function PasswordInput({ id, value, onChange, invalid, autoComplete, show, onToggle }: {
  id?: string; value: string; onChange: (v: string) => void; invalid?: boolean; autoComplete?: string; show: boolean; onToggle: () => void
}) {
  const { t } = useT()
  return (
    <InputGroup invalid={invalid}>
      <Input id={id} type={show ? 'text' : 'password'} autoComplete={autoComplete} value={value} aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)} className={bareInput} />
      <button type="button" onClick={onToggle} aria-label={t.showPw} className="flex items-center px-3 text-muted-foreground hover:text-primary">
        <Icon name={show ? 'visibility_off' : 'visibility'} />
      </button>
    </InputGroup>
  )
}

/** Input with a unit suffix (min, TND…). */
export function SuffixInput({ id, value, onChange, suffix, invalid, placeholder, className, ...rest }: {
  id?: string; value: string; onChange: (v: string) => void; suffix: string; invalid?: boolean; placeholder?: string; className?: string; 'aria-label'?: string
}) {
  return (
    <InputGroup invalid={invalid} className={className}>
      <Input id={id} inputMode="numeric" placeholder={placeholder} value={value} aria-invalid={invalid || undefined} aria-label={rest['aria-label']}
        onChange={(e) => onChange(e.target.value)} className={cn(bareInput, 'font-latin')} />
      <span className="flex items-center px-3 font-semibold text-muted-foreground">{suffix}</span>
    </InputGroup>
  )
}

export const STATUS_STYLE: Record<Status, { key: 'stUpcoming' | 'stDone' | 'stCancelled'; cls: string; dot: string }> = {
  upcoming: { key: 'stUpcoming', cls: 'bg-blue-wash text-primary', dot: 'bg-primary' },
  done: { key: 'stDone', cls: 'bg-success-soft text-success', dot: 'bg-success' },
  cancelled: { key: 'stCancelled', cls: 'bg-[#FDEBEC] text-danger-ink', dot: 'bg-danger-ink' },
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const { t } = useT()
  const s = STATUS_STYLE[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-xs font-bold whitespace-nowrap', s.cls, className)}>
      <span className={cn('size-1.5 rounded-full', s.dot)} />
      {t[s.key]}
    </span>
  )
}

/** Small uppercase teal section label. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('text-xs font-bold tracking-[.06em] text-teal uppercase', className)}>{children}</span>
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-bold tracking-[.05em] text-muted-foreground uppercase">{children}</span>
}

/** Rounded square icon tile. */
export function IconTile({ name, className, size = 20 }: { name: string; className?: string; size?: number }) {
  return (
    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-[11px]', className)}>
      <Icon name={name} size={size} />
    </span>
  )
}

export function InfoNote({ icon = 'info', children, className }: { icon?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start gap-2.5 rounded-xl bg-[#E8F7FA] px-3.5 py-3 text-sm leading-relaxed text-teal-ink', className)}>
      <Icon name={icon} />
      <span>{children}</span>
    </div>
  )
}
