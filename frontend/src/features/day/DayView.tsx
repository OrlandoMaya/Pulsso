import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
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
import type { AgendaDay, DayItem, DayList } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useCalendarActions } from '../calendar/editor-context'
import { ItemCheckbox } from '../calendar/ItemCheckbox'
import { SpecialChip } from '../calendar/SpecialChip'
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

  const sensors = useSensors(
    // Un pequeño margen para no confundir clic con arrastre
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = items.findIndex((i) => i.id === active.id)
    const to = items.findIndex((i) => i.id === over.id)
    if (from < 0 || to < 0) return
    reorder.mutate(arrayMove(items, from, to))
  }

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

          {current.isError ? (
            <div
              role="alert"
              className="flex flex-col items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-8 text-center"
            >
              <p className="text-sm font-medium text-destructive">No se pudo cargar la lista</p>
              <p className="max-w-sm text-sm text-muted-foreground">{current.error.message}</p>
              <Button variant="outline" size="sm" onClick={() => current.refetch()}>
                Reintentar
              </Button>
            </div>
          ) : current.isPending ? (
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragEnd={onDragEnd}
              accessibility={{ announcements: announcements(items), screenReaderInstructions }}
            >
              <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
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
              </SortableContext>
            </DndContext>
          )}
        </section>

        <DayAgenda date={key} day={agenda} />
      </div>
    </div>
  )
}

const screenReaderInstructions = {
  draggable:
    'Para reordenar, presiona Espacio o Enter. Usa las flechas arriba y abajo para mover la tarea, Espacio o Enter para soltarla, o Escape para cancelar.',
}

/** Mensajes en español para lectores de pantalla */
function announcements(items: DayItem[]): Announcements {
  const title = (id: string | number) => items.find((i) => i.id === id)?.title ?? 'la tarea'
  const pos = (id: string | number) => items.findIndex((i) => i.id === id) + 1
  return {
    onDragStart: ({ active }) => `Tomaste ${title(active.id)}, posición ${pos(active.id)} de ${items.length}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${title(active.id)} está en la posición ${pos(over.id)} de ${items.length}.`
        : `${title(active.id)} fuera de la lista.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `Soltaste ${title(active.id)} en la posición ${pos(over.id)} de ${items.length}.`
        : `Soltaste ${title(active.id)}.`,
    onDragCancel: ({ active }) => `Cancelado. ${title(active.id)} volvió a su lugar.`,
  }
}

/** Eventos y recurrentes del calendario para este día */
function DayAgenda({ date, day }: { date: string; day?: AgendaDay }) {
  const { openEditor } = useCalendarActions()
  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start" aria-label="Agenda del día">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Agenda</h2>
          <Button variant="ghost" size="sm" onClick={() => openEditor({ mode: 'create', type: 'normal', date })}>
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

            {day.events.some((e) => e.allDay) && (
              <div className="flex flex-col gap-1.5">
                {day.events
                  .filter((e) => e.allDay)
                  .map((e) => (
                    <SpecialChip key={e.sourceId} event={e} date={date} size="md" />
                  ))}
              </div>
            )}

            {day.events.length === 0 && day.tasks.length === 0 && (
              <p className="text-sm text-muted-foreground">Nada en el calendario este día.</p>
            )}

            {pairRows(day.events.filter((e) => !e.allDay)).map((row) => (
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
