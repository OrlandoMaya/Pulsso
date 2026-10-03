import { addDays } from 'date-fns'
import { CalendarDays, Columns2, ListChecks, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { COLORS } from '@/lib/colors'
import { hhmm, toKey } from '@/lib/dates'
import { pairRows } from '@/lib/overlap'
import { DayExpenses } from '../finance/DayExpenses'
import type { AgendaDay } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useCalendarActions } from '../calendar/editor-context'
import { useCalendars, useCarryOverTasks } from '../calendar/queries'
import { SpecialChip } from '../calendar/SpecialChip'
import { isBanner } from '@/lib/multiday'
import { QuickAddTask } from '../tasks/QuickAddTask'
import { TaskList } from '../tasks/TaskList'
import { ALL, useCategoryFilter } from './useCategoryFilter'

export function DayView({ date, agenda }: { date: Date; agenda?: AgendaDay }) {
  const key = toKey(date)
  const calendars = useCalendars()
  const { filter, setFilter } = useCategoryFilter()
  const carryOver = useCarryOverTasks()

  // Si la categoría guardada ya no existe, se muestran todas
  const active = filter !== ALL && calendars.data?.some((c) => c.id === filter) ? filter : ALL
  const allTasks = agenda?.tasks ?? []
  const tasks = active === ALL ? allTasks : allTasks.filter((t) => t.calendarId === active)
  const done = tasks.filter((t) => t.done).length
  const pct = tasks.length ? Math.round((done * 100) / tasks.length) : 0
  const count = (id: string) => {
    const list = id === ALL ? allTasks : allTasks.filter((t) => t.calendarId === id)
    return list.length ? `${list.filter((t) => t.done).length}/${list.length}` : null
  }
  const activeName = calendars.data?.find((c) => c.id === active)?.name

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto grid w-full max-w-6xl gap-6 p-4 pb-24 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:pb-6">
        <section className="flex min-w-0 flex-col gap-4" aria-label="Tareas del día">
          <div className="flex items-start gap-3">
            {/* Filtro por categoría */}
            <div role="radiogroup" aria-label="Categoría" className="flex flex-1 flex-wrap gap-1.5">
              {[
                { id: ALL, name: 'Todas', dot: null as string | null },
                ...(calendars.data ?? []).map((c) => ({ id: c.id, name: c.name, dot: COLORS[c.color].dot })),
              ].map(({ id, name, dot }) => {
                const selected = active === id
                const n = count(id)
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setFilter(id)}
                    className={cn(
                      'flex h-8 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                      selected && 'border-primary bg-primary text-primary-foreground hover:text-primary-foreground',
                    )}
                  >
                    {dot && <span className={cn('size-2 rounded-full', dot)} />}
                    {name}
                    {n && <span className="font-mono text-[11px] opacity-70">{n}</span>}
                  </button>
                )
              })}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Más opciones de la lista">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  disabled={!tasks.some((t) => !t.done && !t.recurring)}
                  onSelect={() =>
                    carryOver.mutate({
                      from: key,
                      to: toKey(addDays(date, 1)),
                      calendarIds: active === ALL ? undefined : [active],
                    })
                  }
                >
                  <CalendarDays />
                  Pasar pendientes a mañana
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {tasks.length > 0 && (
            <div className="flex items-center gap-3">
              <Progress
                value={pct}
                className="flex-1"
                indicatorClassName={cn(pct === 100 && 'bg-emerald-600 dark:bg-emerald-500')}
              />
              <span className="font-mono text-[13px] text-muted-foreground">
                {done}/{tasks.length}
              </span>
            </div>
          )}

          <QuickAddTask key={`${key}-${active}`} date={key} defaultCalendarId={active === ALL ? undefined : active} />

          {!agenda ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-[76px] rounded-xl" />
              <Skeleton className="h-[76px] rounded-xl" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center">
              <ListChecks className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">
                {activeName ? `Sin tareas de ${activeName} este día` : 'Sin tareas este día'}
              </p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Escribe arriba lo que quieres lograr. Puedes agregar una descripción con pasos o notas.
              </p>
            </div>
          ) : (
            <TaskList tasks={tasks} date={key} />
          )}
        </section>

        <DayEvents date={key} day={agenda} />
      </div>
    </div>
  )
}

/** Eventos del día (las tareas están en la lista principal) */
function DayEvents({ date, day }: { date: string; day?: AgendaDay }) {
  const { openEditor } = useCalendarActions()
  const timed = day?.events.filter((e) => !isBanner(e)) ?? []
  const allDay = day?.events.filter(isBanner) ?? []

  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start" aria-label="Eventos y gastos del día">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Eventos</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditor({ mode: 'create', kind: 'event', recurrence: 'normal', date })}
          >
            Nuevo evento
          </Button>
        </div>

        {!day ? (
          <Skeleton className="h-24" />
        ) : (
          <>
            {allDay.map((e) => (
              <SpecialChip key={e.sourceId} event={e} date={date} size="md" />
            ))}
            {day.events.length === 0 && <p className="text-sm text-muted-foreground">Sin eventos este día.</p>}
            {pairRows(timed).map((row) => (
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
                      <button
                        key={ev.sourceId}
                        type="button"
                        onClick={() => openEditor({ mode: 'edit', kind: 'event', id: ev.sourceId, date })}
                        className={cn(
                          'flex min-w-0 cursor-pointer flex-col rounded-lg border-l-[3px] px-2.5 py-2 text-left',
                          c.soft,
                          c.text,
                          c.bar,
                        )}
                      >
                        <span className="truncate text-sm font-semibold">{ev.title}</span>
                        <span className="text-xs opacity-80">
                          {hhmm(ev.start)} – {hhmm(ev.end)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      <div className="rounded-xl border bg-card p-4">
        <DayExpenses date={date} compact />
      </div>
    </aside>
  )
}
