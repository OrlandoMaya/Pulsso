import { useEffect, useRef } from 'react'
import { format, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { Repeat, Sparkles } from 'lucide-react'
import { COLORS } from '@/lib/colors'
import { durationMinutes, eachDay, fromKey, hhmm, minutesOfDay, toKey } from '@/lib/dates'
import { layoutOverlaps } from '@/lib/overlap'
import type { AgendaDay, AgendaEvent } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useCalendarActions } from '../editor-context'
import { ItemCheckbox } from '../ItemCheckbox'
import { useNow } from '../navigation'
import { SpecialChip } from '../SpecialChip'
import { isBanner, layoutBars } from '@/lib/multiday'
import { SubtaskCount } from '../../tasks/SubtaskCount'

const HOUR = 56
const MIN_HEIGHT = 22
const GUTTER = 64

export function WeekView({
  start,
  end,
  days,
  focus,
}: {
  start: Date
  end: Date
  days: Map<string, AgendaDay>
  /** Día que se muestra primero cuando no caben las 7 columnas (móvil) */
  focus: Date
}) {
  const { openDay, openEditor } = useCalendarActions()
  const scroller = useRef<HTMLDivElement>(null)
  const now = useNow()
  const dates = eachDay(start, end)
  const hasTasks = dates.some((d) => (days.get(toKey(d))?.tasks.length ?? 0) > 0)
  const keys = dates.map(toKey)
  // Todo el día y varios días: barras que cruzan las columnas, en carriles
  const bars = layoutBars(
    keys.flatMap((k) => (days.get(k)?.events ?? []).filter(isBanner)),
    keys,
  )
  const hasSpecial = bars.length > 0

  // Al abrir, baja hasta las 7:00 (o una hora antes de ahora si es más temprano).
  // Se repite cuando aparece la franja de tareas porque cambia la altura de la cabecera.
  const weekKey = toKey(start)
  useEffect(() => {
    const hour = Math.max(0, Math.min(7, new Date().getHours() - 1))
    scroller.current?.scrollTo({ top: hour * HOUR })
  }, [weekKey, hasTasks, hasSpecial])

  // En móvil la semana se desplaza de lado: empieza en el día elegido
  const focusKey = toKey(focus)
  useEffect(() => {
    const el = scroller.current
    if (!el || el.scrollWidth <= el.clientWidth) return
    const col = el.querySelector<HTMLElement>(`[data-day="${focusKey}"]`)
    el.scrollTo({ left: col ? col.offsetLeft - GUTTER : 0 })
  }, [focusKey])

  const createAt = (date: Date, e: React.MouseEvent<HTMLDivElement>) => {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
    const minutes = Math.floor((y / HOUR) * 2) * 30
    const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${minutes % 60 ? '30' : '00'}`
    openEditor({ mode: 'create', kind: 'event', recurrence: 'normal', date: toKey(date), time })
  }

  return (
    <div ref={scroller} className="min-h-0 flex-1 overflow-auto overscroll-x-contain">
      {/* En pantallas chicas cada día mide al menos 6.5rem y se desplaza de lado */}
      <div className="min-w-[calc(4rem+7*6.5rem)] md:min-w-0">
        {/* Cabecera fija: días + tareas recurrentes */}
        <div className="sticky top-0 z-30 bg-background">
          <div className="flex border-b">
            <div className="sticky left-0 z-10 w-16 shrink-0 bg-background" />
            <div className="grid flex-1 grid-cols-7">
              {dates.map((d) => {
                const today = isToday(d)
                return (
                  <button
                    key={toKey(d)}
                    data-day={toKey(d)}
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

          {/* Eventos de todo el día */}
          {hasSpecial && (
            <div className="flex border-b">
              <div className="sticky left-0 z-10 flex w-16 shrink-0 flex-col items-end gap-1 bg-background pt-2 pr-2 text-muted-foreground">
                <Sparkles className="size-3.5" />
                <span className="text-[10px] font-medium tracking-wide uppercase leading-tight text-right">
                  Todo el día
                </span>
              </div>
              <div className="relative grid flex-1 auto-rows-[22px] grid-cols-7 gap-y-1 py-1.5">
                {/* Líneas de las columnas */}
                <div className="pointer-events-none absolute inset-0 grid grid-cols-7" aria-hidden>
                  {keys.map((k) => (
                    <div key={k} className="border-l" />
                  ))}
                </div>
                {bars.map((b) => (
                  <SpecialChip
                    key={b.event.sourceId + b.event.start}
                    event={b.event}
                    date={keys[b.from]}
                    continuesBefore={b.before}
                    continuesAfter={b.after}
                    className={cn('relative mx-1', b.before && 'ml-0', b.after && 'mr-0')}
                    style={{ gridColumn: `${b.from + 1} / ${b.to + 2}`, gridRow: b.lane + 1 }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tareas recurrentes sin hora */}
          {hasTasks && (
            <div className="flex border-b bg-sidebar">
              <div className="sticky left-0 z-10 flex w-16 shrink-0 flex-col items-end gap-1 bg-sidebar pt-2.5 pr-2 text-muted-foreground">
                <Repeat className="size-3.5" />
                <span className="text-[10px] font-medium tracking-wide uppercase">Tareas</span>
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
                          <SubtaskCount task={t} />
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
          <div className="sticky left-0 z-20 w-16 shrink-0 bg-background">
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
              const events = (days.get(key)?.events ?? []).filter((e) => !isBanner(e))
              return (
                <div
                  key={key}
                  className={cn('relative border-l', i >= 5 && 'bg-muted/30')}
                  onClick={(e) => createAt(d, e)}
                >
                  {layoutOverlaps(events).map(({ item, lane, lanes, depth }) => (
                    <EventBlock
                      key={item.sourceId + item.start}
                      event={item}
                      date={key}
                      lane={lane}
                      lanes={lanes}
                      depth={depth}
                    />
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
    </div>
  )
}

/** Ancho libre a la derecha de cada día para crear encima de otro evento */
const FREE_STRIP = 14
/** Corrimiento de un evento que va encima de otro más largo */
const NEST_INDENT = 10

function EventBlock({
  event,
  date,
  lane,
  lanes,
  depth,
}: {
  event: AgendaEvent
  date: string
  lane: number
  lanes: number
  depth: number
}) {
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
        // Fondo opaco: un evento encima de otro no se mezcla con el de abajo
        'absolute z-10 flex items-start gap-1 overflow-hidden rounded-md border-l-[3px] bg-background px-1.5 py-1 shadow-[0_0_0_1px_var(--background)]',
        compact && 'items-center py-0',
        c.text,
        c.bar,
        event.done && 'opacity-55',
      )}
      style={{
        top: (startMin / 60) * HOUR + 1,
        height,
        // Queda libre una franja a la derecha: clic ahí crea otro evento a esa hora
        // Encima de uno más largo: corrido a la derecha y por delante
        left: `calc(${depth * NEST_INDENT}px + (100% - ${FREE_STRIP + depth * NEST_INDENT}px) * ${lane / lanes} + 2px)`,
        width: `calc((100% - ${FREE_STRIP + depth * NEST_INDENT}px) / ${lanes} - 3px)`,
        zIndex: 10 + depth,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <span aria-hidden className={cn('pointer-events-none absolute inset-0', c.soft)} />
      <button
        type="button"
        title={`${event.title} · ${range}`}
        className="relative flex h-full min-w-0 flex-1 cursor-pointer flex-col items-stretch justify-start text-left"
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
