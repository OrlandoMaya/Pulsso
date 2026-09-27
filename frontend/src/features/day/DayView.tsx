import { addDays } from 'date-fns'
import { Briefcase, CalendarDays, Columns2, ListChecks, MoreHorizontal, Repeat, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { COLORS } from '@/lib/colors'
import { hhmm, toKey } from '@/lib/dates'
import { pairRows } from '@/lib/overlap'
import { moveBy } from '@/lib/reorder'
import type { AgendaDay, DayList } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useCalendarActions } from '../calendar/editor-context'
import { ItemCheckbox } from '../calendar/ItemCheckbox'
import { AddDayItem } from './AddDayItem'
import { DayItemCard } from './DayItemCard'
import { useCarryOver, useDayItems, useReorderDayItems } from './queries'
import { useDayList } from './useDayList'

const LISTS: { value: DayList; label: string; icon: typeof User }[] = [
  { value: 'personal', label: 'Personal', icon: User },
  { value: 'work', label: 'Trabajo', icon: Briefcase },
]

export function DayView({ date, agenda }: { date: Date; agenda?: AgendaDay }) {
  const key = toKey(date)
  const { list, setList } = useDayList()
  const personal = useDayItems(key, 'personal')
  const work = useDayItems(key, 'work')
  const current = list === 'work' ? work : personal
  const items = current.data ?? []
  const reorder = useReorderDayItems(key, list)
  const carryOver = useCarryOver()

  const done = items.filter((i) => i.done).length
  const pct = items.length ? Math.round((done * 100) / items.length) : 0
  const counts = { personal: personal.data, work: work.data }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto grid w-full max-w-6xl gap-6 p-4 pb-24 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:pb-6">
        <section className="flex min-w-0 flex-col gap-4" aria-label="Tareas del día">
          <div className="flex flex-wrap items-center gap-3">
            {/* Selector Personal / Trabajo */}
            <div role="radiogroup" aria-label="Lista" className="inline-flex h-10 items-center rounded-lg bg-muted p-1">
              {LISTS.map(({ value, label, icon: Icon }) => {
                const data = counts[value]
                const active = list === value
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setList(value)}
                    className={cn(
                      'flex h-full cursor-pointer items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                      active && 'bg-background text-foreground shadow-sm dark:bg-input/40',
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                    {data && data.length > 0 && (
                      <span className="rounded-full bg-muted-foreground/15 px-1.5 font-mono text-[11px]">
                        {data.filter((i) => i.done).length}/{data.length}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="flex-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Más opciones de la lista">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  disabled={items.length === done}
                  onSelect={() => carryOver.mutate({ from: key, to: toKey(addDays(date, 1)), list })}
                >
                  <CalendarDays />
                  Pasar pendientes a mañana
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {items.length > 0 && (
            <div className="flex items-center gap-3">
              <Progress
                value={pct}
                className="flex-1"
                indicatorClassName={cn(pct === 100 && 'bg-emerald-600 dark:bg-emerald-500')}
              />
              <span className="font-mono text-[13px] text-muted-foreground">
                {done}/{items.length}
              </span>
            </div>
          )}

          <AddDayItem key={`${key}-${list}`} date={key} list={list} />

          {current.isPending ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-[76px] rounded-xl" />
              <Skeleton className="h-[76px] rounded-xl" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center">
              <ListChecks className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">
                {list === 'work' ? 'Sin objetivos de trabajo para este día' : 'Sin tareas personales para este día'}
              </p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Escribe arriba lo que quieres lograr. Puedes agregar una descripción con pasos o notas.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {items.map((item, i) => (
                <DayItemCard
                  key={item.id}
                  item={item}
                  index={i}
                  count={items.length}
                  onMove={(dir) => reorder.mutate(moveBy(items, i, dir))}
                />
              ))}
            </ul>
          )}
        </section>

        <DayAgenda date={key} day={agenda} />
      </div>
    </div>
  )
}

/** Eventos y recurrentes del calendario para este día */
function DayAgenda({ date, day }: { date: string; day?: AgendaDay }) {
  const { openEditor } = useCalendarActions()
  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start" aria-label="Agenda del día">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Agenda</h2>
          <Button variant="ghost" size="sm" onClick={() => openEditor({ mode: 'create', kind: 'event', date })}>
            Nuevo evento
          </Button>
        </div>

        {!day ? (
          <Skeleton className="h-24" />
        ) : (
          <>
            {day.tasks.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  <Repeat className="size-3" />
                  Recurrentes
                </span>
                {day.tasks.map((t) => (
                  <label
                    key={t.sourceId}
                    className="flex h-8 cursor-pointer items-center gap-2.5 rounded-md px-1 text-sm hover:bg-accent"
                  >
                    <ItemCheckbox item={t} date={date} />
                    <span className={cn('size-1.5 shrink-0 rounded-full', COLORS[t.color].dot)} />
                    <span className={cn('truncate', t.done && 'text-muted-foreground line-through')}>{t.title}</span>
                  </label>
                ))}
              </div>
            )}

            {day.events.length === 0 && day.tasks.length === 0 && (
              <p className="text-sm text-muted-foreground">Nada en el calendario este día.</p>
            )}

            {pairRows(day.events).map((row) => (
              <div key={row[0].sourceId + row[0].start} className="flex flex-col gap-1">
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
                      <div
                        key={ev.sourceId}
                        className={cn(
                          'flex gap-2 rounded-lg border-l-[3px] px-2.5 py-2',
                          c.soft,
                          c.text,
                          c.bar,
                          ev.done && 'opacity-55',
                        )}
                      >
                        {ev.checkable && <ItemCheckbox item={ev} date={date} className="mt-0.5" />}
                        <button
                          type="button"
                          onClick={() => openEditor({ mode: 'edit', kind: 'event', id: ev.sourceId, date })}
                          className="flex min-w-0 flex-1 cursor-pointer flex-col text-left"
                        >
                          <span className={cn('truncate text-sm font-semibold', ev.done && 'line-through')}>
                            {ev.title}
                          </span>
                          <span className="text-xs opacity-80">
                            {hhmm(ev.start)} – {hhmm(ev.end)}
                          </span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </aside>
  )
}
