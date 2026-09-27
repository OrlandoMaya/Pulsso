import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, Columns2, MoreHorizontal, Pencil, Plus, Repeat, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { COLORS } from '@/lib/colors'
import { capitalize, fromKey, hhmm } from '@/lib/dates'
import { pairRows } from '@/lib/overlap'
import { ONE_OFF_RRULE } from '@/lib/recurrence'
import type { AgendaEvent, AgendaTask } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useCalendarActions } from './editor-context'
import { ItemCheckbox } from './ItemCheckbox'
import { useCalendars, useDay, useDeleteItem, useSaveTask } from './queries'

interface Props {
  date: string | null
  onClose: () => void
  onShowWeek: (date: string) => void
}

export function DayDialog({ date, onClose, onShowWeek }: Props) {
  return (
    <Dialog open={!!date} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[600px]"
      >
        {date && <DayContent date={date} onClose={onClose} onShowWeek={onShowWeek} />}
      </DialogContent>
    </Dialog>
  )
}

function DayContent({
  date,
  onClose,
  onShowWeek,
}: {
  date: string
  onClose: () => void
  onShowWeek: (d: string) => void
}) {
  const { openEditor } = useCalendarActions()
  const day = useDay(date)
  const d = fromKey(date)
  const data = day.data
  const todo: (AgendaTask | AgendaEvent)[] = data ? [...data.tasks, ...data.events.filter((e) => e.checkable)] : []
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
                ? `${data.events.length} ${data.events.length === 1 ? 'evento' : 'eventos'} · ${total - done} ${total - done === 1 ? 'pendiente' : 'pendientes'}`
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
        <section className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Por hacer</h3>
            {todo.length > 0 && <span className="text-xs text-muted-foreground">Marca para tachar</span>}
          </div>
          {day.isPending ? (
            <Skeleton className="h-[104px] rounded-[10px]" />
          ) : todo.length ? (
            <ul className="divide-y overflow-hidden rounded-[10px] border">
              {todo.map((item) => (
                <TodoRow key={item.sourceType + item.sourceId} item={item} date={date} />
              ))}
            </ul>
          ) : (
            <p className="rounded-[10px] border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
              Nada por hacer este día.
            </p>
          )}
          <QuickAdd date={date} />
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Agenda</h3>
          {data && data.events.length === 0 && <p className="text-sm text-muted-foreground">Sin eventos con hora.</p>}
          {data &&
            pairRows(data.events).map((row) => (
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
        <div className="flex-1" />
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
        <Button onClick={() => openEditor({ mode: 'create', kind: 'event', date })}>
          <Plus />
          Nuevo evento
        </Button>
      </footer>
    </>
  )
}

function TodoRow({ item, date }: { item: AgendaTask | AgendaEvent; date: string }) {
  const { openEditor } = useCalendarActions()
  const calendars = useCalendars()
  const remove = useDeleteItem()
  const cal = calendars.data?.find((c) => c.id === item.calendarId)
  const c = COLORS[item.color]
  const isEvent = item.sourceType === 'event'
  const meta = isEvent ? `${hhmm(item.start)} – ${hhmm(item.end)}` : 'Tarea del día'
  const recurring = isEvent ? item.recurring : true

  return (
    <li className={cn('flex min-h-[52px] items-center gap-3 px-3.5 py-2', item.done && 'bg-muted/40')}>
      <ItemCheckbox item={item} date={date} className="size-[18px]" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn('truncate text-sm font-medium', item.done && 'text-muted-foreground line-through')}>
          {item.title}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {isEvent && item.recurring && <Repeat className="size-3" />}
          {meta}
        </span>
      </div>
      {cal && <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', c.soft, c.text)}>{cal.name}</span>}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Opciones de ${item.title}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => openEditor({ mode: 'edit', kind: item.sourceType, id: item.sourceId, date })}
          >
            <Pencil />
            Editar
          </DropdownMenuItem>
          {recurring && (
            <DropdownMenuItem onSelect={() => remove.mutate({ kind: item.sourceType, id: item.sourceId, date })}>
              <X />
              Quitar solo este día
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => remove.mutate({ kind: item.sourceType, id: item.sourceId })}
          >
            <Trash2 />
            {recurring ? 'Eliminar todas' : 'Eliminar'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}

/** Agrega una tarea solo para este día */
function QuickAdd({ date }: { date: string }) {
  const calendars = useCalendars()
  const save = useSaveTask()
  const [title, setTitle] = useState('')
  const [calendarId, setCalendarId] = useState<string>()
  const selected = calendarId ?? calendars.data?.find((c) => c.visible)?.id ?? calendars.data?.[0]?.id

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !selected) return
    save.mutate(
      { data: { title: title.trim(), calendarId: selected, startDate: date, rrule: ONE_OFF_RRULE } },
      { onSuccess: () => setTitle('') },
    )
  }

  return (
    <form onSubmit={submit} className="mt-1 flex flex-wrap gap-2 sm:flex-nowrap">
      <label htmlFor="quick-task" className="sr-only">
        Nueva tarea para este día
      </label>
      <Input
        id="quick-task"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Agregar tarea para este día…"
        maxLength={120}
        className="h-10 w-full sm:w-auto sm:flex-1"
      />
      {/* Se vuelve a montar al llegar los calendarios para que muestre el valor */}
      <Select key={calendars.data ? 'ready' : 'loading'} value={selected} onValueChange={setCalendarId}>
        <SelectTrigger className="h-10! flex-1 sm:w-[130px] sm:flex-none" aria-label="Calendario">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {calendars.data?.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              <span className={cn('size-2 rounded-full', COLORS[c.color].dot)} />
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" variant="outline" className="h-10" disabled={!title.trim() || save.isPending}>
        <Plus />
        Agregar
      </Button>
    </form>
  )
}
