import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { addDays } from 'date-fns'
import {
  ArrowDown,
  ArrowUp,
  CalendarArrowUp,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Repeat,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { COLORS } from '@/lib/colors'
import { fromKey, toKey } from '@/lib/dates'
import type { AgendaTask } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useCalendarActions } from '../calendar/editor-context'
import { ItemCheckbox } from '../calendar/ItemCheckbox'
import { useCalendars, useDeleteItem, usePatchTask } from '../calendar/queries'

interface Props {
  task: AgendaTask
  date: string
  index: number
  count: number
  onMove: (dir: -1 | 1) => void
  compact?: boolean
}

/** Una tarea en una lista (vista Día y modal del día): la misma en ambos lados */
export function TaskCard({ task, date, index, count, onMove, compact = false }: Props) {
  const { openEditor } = useCalendarActions()
  const calendars = useCalendars()
  const patch = usePatchTask()
  const remove = useDeleteItem()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: task.sourceId,
  })

  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  // Si llega otro valor del servidor, se refleja aquí
  const [synced, setSynced] = useState({ title: task.title, description: task.description })
  if (synced.title !== task.title || synced.description !== task.description) {
    setSynced({ title: task.title, description: task.description })
    setTitle(task.title)
    setDescription(task.description)
  }

  const save = () => {
    const t = title.trim()
    if (!t) return setTitle(task.title)
    const d = description.trim()
    if (t !== task.title || d !== task.description) {
      patch.mutate({ id: task.sourceId, patch: { title: t, description: d } })
    }
  }

  const category = calendars.data?.find((c) => c.id === task.calendarId)
  const c = COLORS[task.color]

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'group relative flex gap-2 rounded-xl border bg-card shadow-xs transition-colors sm:gap-3',
        compact ? 'p-2.5 pl-1' : 'p-3 pl-1.5 sm:p-4 sm:pl-2',
        task.done && 'bg-muted/40',
        isDragging && 'z-10 cursor-grabbing border-ring shadow-lg ring-2 ring-ring/30',
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Reordenar ${task.title}`}
        className={cn(
          'mt-0.5 flex h-6 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground/50 outline-none hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50',
          count < 2 && 'invisible',
        )}
      >
        <GripVertical className="size-4" />
      </button>
      <ItemCheckbox item={task} date={date} className="mt-1 size-[18px]" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              setTitle(task.title)
              e.currentTarget.blur()
            }
          }}
          maxLength={120}
          aria-label="Título"
          className={cn(
            'w-full rounded-sm bg-transparent font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
            compact ? 'text-sm' : 'text-[15px]',
            task.done && 'text-muted-foreground line-through',
          )}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setDescription(task.description)
              e.currentTarget.blur()
            }
          }}
          rows={1}
          maxLength={5000}
          placeholder="Agregar descripción…"
          aria-label="Descripción"
          className={cn(
            'field-sizing-content min-h-5 w-full resize-none rounded-sm bg-transparent text-sm leading-relaxed text-muted-foreground outline-none placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-ring/50',
            task.done && 'opacity-70',
          )}
        />
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {category && (
            <span className={cn('rounded-full px-2 py-0.5 font-medium', c.soft, c.text)}>{category.name}</span>
          )}
          {task.recurring && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Repeat className="size-3" />
              Recurrente
            </span>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Opciones de ${task.title}`}
            className="opacity-100 data-[state=open]:opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={() => openEditor({ mode: 'edit', kind: 'task', id: task.sourceId, date })}>
            <Pencil />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem disabled={index === 0} onSelect={() => onMove(-1)}>
            <ArrowUp />
            Subir
          </DropdownMenuItem>
          <DropdownMenuItem disabled={index === count - 1} onSelect={() => onMove(1)}>
            <ArrowDown />
            Bajar
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Tag />
              Categoría
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {calendars.data?.map((cal) => (
                <DropdownMenuItem
                  key={cal.id}
                  disabled={cal.id === task.calendarId}
                  onSelect={() => patch.mutate({ id: task.sourceId, patch: { calendarId: cal.id } })}
                >
                  <span className={cn('size-2 rounded-full', COLORS[cal.color].dot)} />
                  {cal.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          {task.recurring ? (
            <DropdownMenuItem onSelect={() => remove.mutate({ kind: 'task', id: task.sourceId, date })}>
              <X />
              Quitar solo este día
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onSelect={() =>
                patch.mutate({ id: task.sourceId, patch: { startDate: toKey(addDays(fromKey(date), 1)) } })
              }
            >
              <CalendarArrowUp />
              Pasar a mañana
            </DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" onSelect={() => remove.mutate({ kind: 'task', id: task.sourceId })}>
            <Trash2 />
            {task.recurring ? 'Eliminar (todos los días)' : 'Eliminar'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}
