import { useEffect, useRef } from 'react'
import { format, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { Repeat } from 'lucide-react'
import { COLORS } from '@/lib/colors'
import { durationMinutes, eachDay, fromKey, hhmm, minutesOfDay, toKey } from '@/lib/dates'
import { layoutOverlaps } from '@/lib/overlap'
import type { AgendaDay, AgendaEvent } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useCalendarActions } from '../editor-context'
import { ItemCheckbox } from '../ItemCheckbox'
import { useNow } from '../navigation'

const HOUR = 56
const MIN_HEIGHT = 22

export function WeekView({ start, end, days }: { start: Date; end: Date; days: Map<string, AgendaDay> }) {
  const { openDay, openEditor } = useCalendarActions()
  const scroller = useRef<HTMLDivElement>(null)
  const now = useNow()
  const dates = eachDay(start, end)
  const hasTasks = dates.some((d) => (days.get(toKey(d))?.tasks.length ?? 0) > 0)

  // Al abrir, baja hasta las 7:00 (o una hora antes de ahora si es más temprano).
  // Se repite cuando aparece la franja "Diario" porque cambia la altura de la cabecera.
  const weekKey = toKey(start)
  useEffect(() => {
    const hour = Math.max(0, Math.min(7, new Date().getHours() - 1))
    scroller.current?.scrollTo({ top: hour * HOUR })
  }, [weekKey, hasTasks])

  const createAt = (date: Date, e: React.MouseEvent<HTMLDivElement>) => {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
    const minutes = Math.floor((y / HOUR) * 2) * 30
    const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${minutes % 60 ? '30' : '00'}`
    openEditor({ mode: 'create', kind: 'event', date: toKey(date), time })
  }

  return (
    <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
      {/* Cabecera fija: días + tareas recurrentes */}
      <div className="sticky top-0 z-30 bg-background">
        <div className="flex border-b">
          <div className="w-16 shrink-0" />
          <div className="grid flex-1 grid-cols-7">
            {dates.map((d) => {
              const today = isToday(d)
              return (
                <button
                  key={toKey(d)}
                  type="button"
                  onClick={() => openDay(toKey(d))}
                  className="flex h-[68px] cursor-pointer flex-col items-center justify-center gap-1 border-l hover:bg-accent/50"
                  aria-label={`Abrir ${format(d, "EEEE d 'de' LLLL", { locale: es })}`}
                >
                  <span
                    className={cn(
                      'text-xs font-medium tracking-wide uppercase',
                      today ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {format(d, 'EEE', { locale: es }).replace('.', '')}
                  </span>
                  <span
                    className={cn(
                      'grid size-9 place-items-center rounded-full text-lg font-semibold',
                      today && 'bg-primary text-primary-foreground',
                    )}
                  >
                    {format(d, 'd')}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Tareas recurrentes sin hora */}
        {hasTasks && (
          <div className="flex border-b bg-muted/40">
            <div className="flex w-16 shrink-0 flex-col items-end gap-1 pt-2.5 pr-2 text-muted-foreground">
              <Repeat className="size-3.5" />
              <span className="text-[10px] font-medium tracking-wide uppercase">Diario</span>
            </div>
            <div className="grid flex-1 grid-cols-7">
              {dates.map((d) => {
                const key = toKey(d)
                return (
                  <div key={key} className="flex min-h-[84px] min-w-0 flex-col gap-0.5 border-l px-1.5 py-2">
                    {days.get(key)?.tasks.map((t) => (
                      <label
                        key={t.sourceId}
                        className="flex h-6 min-w-0 cursor-pointer items-center gap-1.5 rounded px-1 text-xs hover:bg-background"
                      >
                        <ItemCheckbox item={t} date={key} className="size-3.5" />
                        <span className={cn('size-1.5 shrink-0 rounded-full', COLORS[t.color].dot)} />
                        <span className={cn('truncate', t.done && 'text-muted-foreground line-through')}>
                          {t.title}
                        </span>
                      </label>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Rejilla horaria */}
      <div className="flex" style={{ height: HOUR * 24 }}>
        <div className="relative w-16 shrink-0">
          {Array.from({ length: 23 }, (_, i) => (
            <span
              key={i}
              className="absolute right-2 -translate-y-1/2 font-mono text-[11px] text-muted-foreground"
              style={{ top: (i + 1) * HOUR }}
            >
              {String(i + 1).padStart(2, '0')}:00
            </span>
          ))}
        </div>
        <div
          className="grid flex-1 grid-cols-7"
          style={{
            backgroundImage: `repeating-linear-gradient(to bottom, var(--border) 0, var(--border) 1px, transparent 1px, transparent ${HOUR}px)`,
          }}
        >
          {dates.map((d, i) => {
            const key = toKey(d)
            const events = days.get(key)?.events ?? []
            return (
              <div
                key={key}
                className={cn('relative border-l', i >= 5 && 'bg-muted/30')}
                onClick={(e) => createAt(d, e)}
              >
                {layoutOverlaps(events).map(({ item, lane, lanes }) => (
                  <EventBlock key={item.sourceId + item.start} event={item} date={key} lane={lane} lanes={lanes} />
                ))}
                {isToday(d) && (
                  <div
                    className="pointer-events-none absolute right-0 -left-[5px] z-20 flex items-center"
                    style={{ top: (minutesOfDay(now) / 60) * HOUR - 4 }}
                  >
                    <span className="size-[9px] rounded-full bg-red-500" />
                    <span className="h-0.5 flex-1 bg-red-500" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function EventBlock({ event, date, lane, lanes }: { event: AgendaEvent; date: string; lane: number; lanes: number }) {
  const { openEditor } = useCalendarActions()
  const c = COLORS[event.color]
  // Un evento que pasa de medianoche se recorta al final del día
  const startMin = event.start.slice(0, 10) === date ? minutesOfDay(fromKey(event.start)) : 0
  const endMin = Math.min(24 * 60, startMin + durationMinutes(event.start, event.end))
  const height = Math.max(MIN_HEIGHT, ((endMin - startMin) / 60) * HOUR - 3)
  const compact = height < 40
  const range = `${hhmm(event.start)} – ${hhmm(event.end)}`

  return (
    <div
      className={cn(
        'absolute z-10 flex items-start gap-1 overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 shadow-[0_0_0_1px_var(--background)]',
        compact && 'items-center py-0',
        c.soft,
        c.text,
        c.bar,
        event.done && 'opacity-55',
      )}
      style={{
        top: (startMin / 60) * HOUR + 1,
        height,
        left: `calc(${(lane * 100) / lanes}% + 2px)`,
        width: `calc(${100 / lanes}% - 5px)`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {event.checkable && <ItemCheckbox item={event} date={date} className={cn('size-3.5', !compact && 'mt-px')} />}
      <button
        type="button"
        title={`${event.title} · ${range}`}
        className="flex h-full min-w-0 flex-1 cursor-pointer flex-col items-stretch justify-start text-left"
        onClick={() => openEditor({ mode: 'edit', kind: 'event', id: event.sourceId, date })}
      >
        <span
          className={cn(
            'truncate text-xs leading-tight font-semibold',
            compact && 'leading-[20px]',
            event.done && 'line-through',
          )}
        >
          {event.title}
          {compact && lanes === 1 && <span className="font-normal opacity-80"> · {hhmm(event.start)}</span>}
        </span>
        {!compact && (
          <span className="flex items-center gap-1 truncate text-[11px] opacity-80">
            {event.recurring && <Repeat className="size-2.5 shrink-0" aria-label="Recurrente" />}
            {range}
          </span>
        )}
      </button>
    </div>
  )
}
