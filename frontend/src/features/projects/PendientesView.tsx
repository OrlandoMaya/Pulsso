import { useState } from 'react'
import { Link } from 'react-router'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronRight, GripVertical, MoreHorizontal, Pencil, Plus, Trash2, Workflow } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { COLORS } from '@/lib/colors'
import type { Calendar, GeneralTask } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useCalendars } from '../calendar/queries'
import { GeneralTaskDialog, type GeneralTarget } from './GeneralTaskDialog'
import {
  useCreateGeneralTask,
  useDeleteGeneralTask,
  useGeneralTasks,
  usePatchGeneralTask,
  useReorderGeneralTasks,
} from './queries'

/** Tareas generales (sin día) y proyectos */
export function PendientesView() {
  const items = useGeneralTasks()
  const calendars = useCalendars()
  const [dialog, setDialog] = useState<GeneralTarget | null>(null)
  const [showDone, setShowDone] = useState(false)

  const projects = items.data?.filter((g) => g.isProject) ?? []
  const tasks = items.data?.filter((g) => !g.isProject) ?? []
  const pending = tasks.filter((t) => !t.done)
  const done = tasks.filter((t) => t.done)
  const byId = new Map(calendars.data?.map((c) => [c.id, c]))

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-6 sm:px-8 sm:py-8">
        <section className="flex flex-col gap-4">
          <SectionHeader
            title="Proyectos"
            hint="Diagramas de actividades que se programan como tareas o eventos."
            action={
              <Button variant="outline" size="sm" onClick={() => setDialog({ mode: 'create', isProject: true })}>
                <Plus />
                Nuevo proyecto
              </Button>
            }
          />
          {items.isPending ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-[132px] rounded-xl" />
              ))}
            </div>
          ) : projects.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  calendar={byId.get(p.calendarId)}
                  onEdit={() => setDialog({ mode: 'edit', item: p })}
                />
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setDialog({ mode: 'create', isProject: true })}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center hover:bg-accent/50"
            >
              <Workflow className="size-6 text-muted-foreground" />
              <span className="text-sm font-medium">Crea tu primer proyecto</span>
              <span className="max-w-sm text-xs text-muted-foreground">
                Arma el flujo arrastrando actividades y decisiones, únelas con flechas y programa cada actividad en el
                calendario.
              </span>
            </button>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeader title="Tareas generales" hint="Cosas por hacer sin un día fijo." />
          <QuickAddGeneral />
          {items.isPending ? (
            <Skeleton className="h-[120px] rounded-xl" />
          ) : pending.length ? (
            <SortableGeneralList
              items={pending}
              calendars={byId}
              onEdit={(item) => setDialog({ mode: 'edit', item })}
            />
          ) : (
            <p className="rounded-xl border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
              {done.length ? '¡Todo hecho!' : 'Nada pendiente.'}
            </p>
          )}
          {done.length > 0 && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowDone((v) => !v)}
                aria-expanded={showDone}
                className="flex w-fit cursor-pointer items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className={cn('size-4 transition-transform', showDone && 'rotate-90')} />
                Hechas ({done.length})
              </button>
              {showDone && (
                <ul className="flex flex-col gap-2">
                  {done.map((t) => (
                    <GeneralRow
                      key={t.id}
                      item={t}
                      calendar={byId.get(t.calendarId)}
                      onEdit={() => setDialog({ mode: 'edit', item: t })}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>
      <GeneralTaskDialog target={dialog} onClose={() => setDialog(null)} />
    </div>
  )
}

function SectionHeader({ title, hint, action }: { title: string; hint: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      {action}
    </div>
  )
}

function ProjectCard({ project, calendar, onEdit }: { project: GeneralTask; calendar?: Calendar; onEdit: () => void }) {
  const remove = useDeleteGeneralTask()
  const p = project.progress ?? { done: 0, inProgress: 0, total: 0 }
  const pct = p.total ? Math.round((p.done * 100) / p.total) : 0
  const c = calendar ? COLORS[calendar.color] : null

  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-ring">
      <Link
        to={`/proyectos/${project.id}`}
        className="absolute inset-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label={`Abrir ${project.title}`}
      />
      <div className="flex items-start gap-2.5">
        <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', c?.dot ?? 'bg-muted-foreground')} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-medium">{project.title}</span>
          <span className="line-clamp-2 min-h-8 text-xs text-muted-foreground">
            {project.description || calendar?.name}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Opciones de ${project.title}`} className="relative">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                if (confirm(`¿Eliminar "${project.title}"? Lo programado en el calendario se queda allí.`))
                  remove.mutate(project.id)
              }}
            >
              <Trash2 />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex flex-col gap-1.5">
        <Progress
          value={pct}
          className="h-1.5"
          indicatorClassName={cn(pct === 100 && 'bg-emerald-600 dark:bg-emerald-500')}
        />
        <span className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {p.done}/{p.total} actividades
          </span>
          {p.inProgress > 0 && (
            <span className="flex items-center gap-1.5 text-flow-active">
              <span className="flow-heartbeat size-1.5 rounded-full bg-flow-active" />
              {p.inProgress} en progreso
            </span>
          )}
        </span>
      </div>
    </div>
  )
}

function QuickAddGeneral() {
  const calendars = useCalendars()
  const create = useCreateGeneralTask()
  const [title, setTitle] = useState('')
  const [picked, setPicked] = useState<string>()
  const calendarId = picked ?? calendars.data?.find((c) => c.visible)?.id ?? calendars.data?.[0]?.id

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const t = title.trim()
    if (!t || !calendarId || create.isPending) return
    create.mutate({ title: t, calendarId }, { onSuccess: () => setTitle('') })
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-3 rounded-xl border border-dashed bg-card/50 p-2 pl-3 focus-within:border-solid focus-within:border-ring"
    >
      <Plus className="size-[18px] shrink-0 text-muted-foreground" />
      <label htmlFor="new-general-task" className="sr-only">
        Nueva tarea general
      </label>
      <input
        id="new-general-task"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Agregar tarea general…"
        maxLength={120}
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
      />
      <Select key={calendarId ? 'ready' : 'empty'} value={calendarId} onValueChange={setPicked}>
        <SelectTrigger aria-label="Categoría" className="h-8 w-auto max-w-[40%] border-none shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {calendars.data?.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              <span className={cn('size-2 rounded-full', COLORS[c.color].dot)} />
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" size="sm" disabled={!title.trim() || create.isPending}>
        Agregar
      </Button>
    </form>
  )
}

function SortableGeneralList({
  items,
  calendars,
  onEdit,
}: {
  items: GeneralTask[]
  calendars: Map<string, Calendar>
  onEdit: (g: GeneralTask) => void
}) {
  const reorder = useReorderGeneralTasks()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = items.findIndex((t) => t.id === active.id)
    const to = items.findIndex((t) => t.id === over.id)
    if (from >= 0 && to >= 0) reorder.mutate(arrayMove(items, from, to).map((t) => t.id))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2">
          {items.map((t) => (
            <GeneralRow
              key={t.id}
              item={t}
              calendar={calendars.get(t.calendarId)}
              onEdit={() => onEdit(t)}
              sortable
              count={items.length}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

function GeneralRow({
  item,
  calendar,
  onEdit,
  sortable = false,
  count = 0,
}: {
  item: GeneralTask
  calendar?: Calendar
  onEdit: () => void
  sortable?: boolean
  count?: number
}) {
  const patch = usePatchGeneralTask()
  const remove = useDeleteGeneralTask()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !sortable,
  })
  const [title, setTitle] = useState(item.title)
  const [synced, setSynced] = useState(item.title)
  if (synced !== item.title) {
    setSynced(item.title)
    setTitle(item.title)
  }
  const c = calendar ? COLORS[calendar.color] : null

  const save = () => {
    const t = title.trim()
    if (!t) return setTitle(item.title)
    if (t !== item.title) patch.mutate({ id: item.id, patch: { title: t } })
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'group relative flex items-start gap-2 rounded-xl border bg-card p-3 pl-1.5 shadow-xs sm:gap-3',
        item.done && 'bg-muted/40',
        isDragging && 'z-10 cursor-grabbing border-ring shadow-lg ring-2 ring-ring/30',
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Reordenar ${item.title}`}
        className={cn(
          'mt-0.5 flex h-6 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground/50 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50',
          (!sortable || count < 2) && 'invisible',
        )}
      >
        <GripVertical className="size-4" />
      </button>
      <Checkbox
        checked={item.done}
        aria-label={`${item.done ? 'Desmarcar' : 'Marcar'} ${item.title}`}
        className="mt-1 size-[18px]"
        onCheckedChange={(v) => patch.mutate({ id: item.id, patch: { done: v === true } })}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              setTitle(item.title)
              e.currentTarget.blur()
            }
          }}
          maxLength={120}
          aria-label="Título"
          className={cn(
            'w-full rounded-sm bg-transparent text-[15px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
            item.done && 'text-muted-foreground line-through',
          )}
        />
        {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
        {calendar && (
          <span className={cn('w-fit rounded-full px-2 py-0.5 text-xs font-medium', c?.soft, c?.text)}>
            {calendar.name}
          </span>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Opciones de ${item.title}`}
            className="opacity-100 data-[state=open]:opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => remove.mutate(item.id)}>
            <Trash2 />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}
