import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, Columns2, ListChecks, Plus, Repeat, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { COLORS } from '@/lib/colors'
import { capitalize, fromKey, hhmm } from '@/lib/dates'
import { pairRows } from '@/lib/overlap'
import type { AgendaTask } from '@/lib/types'
import { cn } from '@/lib/utils'
import { QuickAddTask } from '../tasks/QuickAddTask'
import { TaskList } from '../tasks/TaskList'
import { useCalendarActions } from './editor-context'
import { useDay } from './queries'
import { SpecialChip } from './SpecialChip'
import { isBanner } from '@/lib/multiday'

interface Props {
  date: string | null
  onClose: () => void
  onShowWeek: (date: string) => void
  onShowDay: (date: string) => void
}

export function DayDialog({ date, onClose, onShowWeek, onShowDay }: Props) {
  return (
    <Dialog open={!!date} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[600px]"
      >
        {date && <DayContent date={date} onClose={onClose} onShowWeek={onShowWeek} onShowDay={onShowDay} />}
      </DialogContent>
    </Dialog>
  )
}

function DayContent({
  date,
  onClose,
  onShowWeek,
  onShowDay,
}: {
  date: string
  onClose: () => void
  onShowWeek: (d: string) => void
  onShowDay: (d: string) => void
}) {
  const { openEditor } = useCalendarActions()
  const day = useDay(date)
  const d = fromKey(date)
  const data = day.data
  // Solo las tareas se tachan; los eventos van aparte en su propia sección
  const todo: AgendaTask[] = data?.tasks ?? []
  const { done = 0, total = 0 } = data?.progress ?? {}
  const pct = total ? Math.round((done * 100) / total) : 0

  return (
    <>
      <header className="flex flex-col gap-3.5 border-b px-4 pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-[18px]">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-[52px] shrink-0 flex-col items-center justify-center rounded-[10px] bg-primary text-primary-foreground">
            <span className="text-[11px] font-medium tracking-wider uppercase opacity-75">
              {format(d, 'EEE', { locale: es }).replace('.', '')}
            </span>
            <span className="text-[22px] leading-none font-semibold">{format(d, 'd')}</span>
          </div>
          <div className="flex flex-1 flex-col gap-0.5 pt-1">
            <DialogTitle className="text-xl tracking-tight">
              {capitalize(format(d, "EEEE d 'de' LLLL", { locale: es }))}
            </DialogTitle>
            <DialogDescription>
              {data
                ? `${data.events.length} ${data.events.length === 1 ? 'evento' : 'eventos'} · ${total - done} ${total - done === 1 ? 'tarea pendiente' : 'tareas pendientes'}`
                : 'Cargando…'}
            </DialogDescription>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Cerrar" onClick={onClose}>
            <X />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Progress
            value={pct}
            className="h-2 flex-1"
            indicatorClassName={cn(pct === 100 && 'bg-emerald-600 dark:bg-emerald-500')}
          />
          <span className="font-mono text-[13px] text-muted-foreground">
            {done}/{total}
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-6 overflow-y-auto px-4 pt-4 pb-4 sm:px-6 sm:pt-[18px]">
        {data && data.events.some(isBanner) && (
          <div className="flex flex-wrap gap-2">
            {data.events.filter(isBanner).map((e) => (
              <SpecialChip key={e.sourceId} event={e} date={date} size="md" />
            ))}
          </div>
        )}

        <section className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Tareas</h3>
            {todo.length > 0 && <span className="text-xs text-muted-foreground">Marca para tachar</span>}
          </div>
          <QuickAddTask date={date} />
          {day.isPending ? (
            <Skeleton className="h-[104px] rounded-[10px]" />
          ) : todo.length ? (
            <TaskList tasks={todo} date={date} compact />
          ) : (
            <p className="rounded-[10px] border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
              Nada por hacer este día.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Eventos</h3>
          {data && data.events.every(isBanner) && (
            <p className="text-sm text-muted-foreground">Sin eventos con hora.</p>
          )}
          {data &&
            pairRows(data.events.filter((e) => !isBanner(e))).map((row) => (
              <div key={row[0].sourceId + row[0].start} className="flex gap-3">
                <span className="w-11 shrink-0 pt-2.5 text-right font-mono text-xs text-muted-foreground">
                  {hhmm(row[0].start)}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {row.length === 2 && (
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                      <Columns2 className="size-3" />
                      Al mismo tiempo
                    </span>
                  )}
                  <div className={cn('grid gap-1.5', row.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
                    {row.map((ev) => {
                      const c = COLORS[ev.color]
                      return (
                        <button
                          key={ev.sourceId}
                          type="button"
                          onClick={() => openEditor({ mode: 'edit', kind: 'event', id: ev.sourceId, date })}
                          className={cn(
                            'flex cursor-pointer flex-col gap-0.5 rounded-lg border-l-[3px] px-3 py-2 text-left',
                            c.soft,
                            c.text,
                            c.bar,
                            ev.done && 'opacity-55',
                          )}
                        >
                          <span className={cn('truncate text-sm font-semibold', ev.done && 'line-through')}>
                            {ev.title}
                          </span>
                          <span className="flex items-center gap-1 text-xs opacity-80">
                            {ev.recurring && <Repeat className="size-3" />}
                            {hhmm(ev.start)} – {hhmm(ev.end)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
        </section>
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t bg-muted/40 px-4 py-3 sm:px-6 sm:py-4">
        <Button variant="ghost" onClick={() => onShowWeek(date)}>
          <CalendarDays />
          <span className="max-sm:sr-only">Ver en semana</span>
        </Button>
        <Button variant="ghost" onClick={() => onShowDay(date)}>
          <ListChecks />
          <span className="max-sm:sr-only">Abrir día</span>
        </Button>
        <div className="flex-1" />
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
        <Button onClick={() => openEditor({ mode: 'create', kind: 'event', recurrence: 'normal', date })}>
          <Plus />
          Nuevo evento
        </Button>
      </footer>
    </>
  )
}
