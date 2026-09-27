import { format, isSameMonth, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check, Repeat } from 'lucide-react'
import { COLORS } from '@/lib/colors'
import { eachDay, hhmm, toKey } from '@/lib/dates'
import { pairRows } from '@/lib/overlap'
import type { AgendaDay, AgendaEvent } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useCalendarActions } from '../editor-context'
import { ItemCheckbox } from '../ItemCheckbox'

const DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MAX_TASKS = 3
const MAX_ROWS = 2

export function MonthView({
  month,
  start,
  end,
  days,
}: {
  month: Date
  start: Date
  end: Date
  days: Map<string, AgendaDay>
}) {
  const dates = eachDay(start, end)
  const todayKey = toKey(new Date())

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="sticky top-0 z-10 grid shrink-0 grid-cols-7 border-b bg-background">
        {DOW.map((d) => (
          <div
            key={d}
            className="flex h-10 items-center border-l px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid flex-1 auto-rows-[minmax(84px,1fr)] grid-cols-7 sm:auto-rows-[minmax(150px,1fr)]">
        {dates.map((d, i) => (
          <DayCell
            key={toKey(d)}
            date={d}
            day={days.get(toKey(d))}
            inMonth={isSameMonth(d, month)}
            weekend={i % 7 >= 5}
            past={toKey(d) < todayKey}
          />
        ))}
      </div>
    </div>
  )
}

function DayCell({
  date,
  day,
  inMonth,
  weekend,
  past,
}: {
  date: Date
  day?: AgendaDay
  inMonth: boolean
  weekend: boolean
  past: boolean
}) {
  const { openDay, openEditor } = useCalendarActions()
  const key = toKey(date)
  const today = isToday(date)
  const tasks = day?.tasks ?? []
  const rows = pairRows(day?.events ?? [])
  const shownRows = rows.slice(0, MAX_ROWS)
  const hidden = Math.max(0, tasks.length - MAX_TASKS) + rows.slice(MAX_ROWS).reduce((n, r) => n + r.length, 0)
  const { done = 0, total = 0 } = day?.progress ?? {}
  const complete = total > 0 && done === total

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-[3px] overflow-hidden border-b border-l p-1.5',
        !inMonth ? 'bg-muted/50' : weekend && 'bg-muted/25',
      )}
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => openDay(key)}
          aria-label={`Abrir ${format(date, "EEEE d 'de' LLLL", { locale: es })}`}
          className={cn(
            'grid h-[26px] min-w-[26px] cursor-pointer place-items-center rounded-full px-1 text-[13px] font-medium hover:bg-accent',
            !inMonth && 'text-muted-foreground',
            today && 'bg-primary font-semibold text-primary-foreground hover:bg-primary/90',
          )}
        >
          {date.getDate() === 1 ? format(date, 'd LLL', { locale: es }) : date.getDate()}
        </button>
        {total > 0 && (
          <span
            className={cn(
              'flex items-center gap-0.5 pr-0.5 font-mono text-[11px] max-sm:hidden',
              complete
                ? 'text-emerald-600 dark:text-emerald-400'
                : past
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-muted-foreground',
            )}
            title={`${done} de ${total} hechas`}
          >
            {complete && <Check className="size-3" />}
            {done}/{total}
          </span>
        )}
      </div>

      {/* En móvil: solo puntos; al tocar se abre el día */}
      {(tasks.length > 0 || rows.length > 0) && (
        <button
          type="button"
          onClick={() => openDay(key)}
          aria-label={`${total - done} pendientes, ${day?.events.length ?? 0} eventos`}
          className="flex flex-1 cursor-pointer flex-wrap content-start gap-1 px-1 pt-0.5 sm:hidden"
        >
          {tasks.map((t) => (
            <span
              key={t.sourceId}
              className={cn('size-1.5 rounded-full border border-muted-foreground', t.done && 'bg-muted-foreground')}
            />
          ))}
          {day?.events.map((ev) => (
            <span key={ev.sourceId + ev.start} className={cn('size-1.5 rounded-full', COLORS[ev.color].dot)} />
          ))}
        </button>
      )}

      {tasks.slice(0, MAX_TASKS).map((t) => (
        <label
          key={t.sourceId}
          className="flex h-[19px] min-w-0 cursor-pointer items-center gap-1.5 px-0.5 text-[11.5px] max-sm:hidden"
        >
          <ItemCheckbox item={t} date={key} className="size-3.5" />
          <span className={cn('truncate', t.done && 'text-muted-foreground line-through')}>{t.title}</span>
        </label>
      ))}

      {shownRows.map((row) => (
        <div
          key={row[0].sourceId + row[0].start}
          className={cn('grid gap-[3px] max-sm:hidden', row.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}
        >
          {row.map((ev) => (
            <EventChip
              key={ev.sourceId + ev.start}
              event={ev}
              onClick={() => openEditor({ mode: 'edit', kind: 'event', id: ev.sourceId, date: key })}
            />
          ))}
        </div>
      ))}

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => openDay(key)}
          className="h-[18px] cursor-pointer px-1 text-left max-sm:hidden text-[11.5px] font-medium text-muted-foreground hover:text-foreground"
        >
          +{hidden} más
        </button>
      )}
    </div>
  )
}

function EventChip({ event, onClick }: { event: AgendaEvent; onClick: () => void }) {
  const c = COLORS[event.color]
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${hhmm(event.start)} ${event.title}`}
      className={cn(
        'flex h-[22px] min-w-0 cursor-pointer items-center gap-1 rounded-[5px] border-l-2 px-1.5 text-left text-[11.5px]',
        c.soft,
        c.text,
        c.bar,
        event.done && 'opacity-55',
      )}
    >
      <span className="shrink-0 font-mono text-[10.5px] opacity-80">{hhmm(event.start)}</span>
      <span className={cn('truncate font-medium', event.done && 'line-through')}>{event.title}</span>
      {event.recurring && <Repeat className="size-2.5 shrink-0 opacity-70" aria-label="Recurrente" />}
    </button>
  )
}
