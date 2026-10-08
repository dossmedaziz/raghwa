import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Icon } from '@/components/common'
import { useServiceEditor, useServiceRows } from '@/components/garage-editors'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { Page } from '@/layouts/app-layout'

export function ServicesPage() {
  const { t } = useT()
  const { services, countLabel, label, toggle } = useServiceRows()
  const ed = useServiceEditor()
  return (
    <Page title={t.navServices} sub={t.svcSub}
      action={<Button onClick={ed.openNew} className="shrink-0 text-[14.5px]"><Icon name="add" />{t.addService}</Button>}>
      <span className="-mt-2 text-muted-foreground">{countLabel}</span>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,290px),1fr))] gap-4">
        {services.map((sv) => {
          const l = label(sv)
          return (
            <Card key={sv.id} className={cn('gap-3 px-[18px] py-[18px]', !sv.active && 'opacity-60')}>
              <div className="flex items-start justify-between gap-2.5">
                <span className="flex size-11 items-center justify-center rounded-[13px] bg-teal-soft text-teal"><Icon name="local_car_wash" size={24} /></span>
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs font-bold', sv.active ? 'text-success' : 'text-subtle')}>{sv.active ? t.active : t.inactive}</span>
                  <Switch checked={sv.active} onCheckedChange={() => toggle(sv.id)} aria-label={l.name} />
                </div>
              </div>
              <div className="flex flex-col gap-[3px]">
                <span className="text-[16.5px] font-bold">{l.name}</span>
                <span className="text-[13px] text-muted-foreground">{l.other}</span>
              </div>
              <span className="flex-1 text-[13.5px] leading-relaxed text-ink-2">{l.desc}</span>
              <div className="flex items-center gap-1.5 border-t border-line pt-3">
                <span className="flex-1 text-xl font-bold text-navy">{l.price}</span>
                <Button variant="outline" size="sm" onClick={() => ed.openEdit(sv)} className="border border-border text-[13px] font-semibold text-ink-2">
                  <Icon name="edit" size={18} />{t.edit}
                </Button>
                <Button variant="outline" size="icon" onClick={() => ed.askDelete(sv)} aria-label={t.del} title={t.del}
                  className="border border-[#F5D3D5] text-destructive hover:bg-danger-soft hover:text-destructive">
                  <Icon name="delete" size={19} />
                </Button>
              </div>
            </Card>
          )
        })}
        <button type="button" onClick={ed.openNew}
          className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-[18px] border-[1.5px] border-dashed border-[#B9C6D8] text-[14.5px] font-bold text-primary hover:border-primary hover:bg-[#F2F7FD]">
          <Icon name="add_circle" size={30} />{t.addService}
        </button>
      </div>
      {ed.dialogs}
    </Page>
  )
}
