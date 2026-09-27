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
import { moveBy } from '@/lib/reorder'
import type { AgendaTask } from '@/lib/types'
import { useReorderTasks } from '../calendar/queries'
import { TaskCard } from './TaskCard'

/** Lista de tareas de un día, reordenable arrastrando (mouse, táctil o teclado) */
export function TaskList({ tasks, date, compact }: { tasks: AgendaTask[]; date: string; compact?: boolean }) {
  const reorder = useReorderTasks()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const save = (list: AgendaTask[]) => reorder.mutate(list.map((t) => t.sourceId))

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = tasks.findIndex((t) => t.sourceId === active.id)
    const to = tasks.findIndex((t) => t.sourceId === over.id)
    if (from >= 0 && to >= 0) save(arrayMove(tasks, from, to))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={onDragEnd}
      accessibility={{ announcements: announcements(tasks), screenReaderInstructions }}
    >
      <SortableContext items={tasks.map((t) => t.sourceId)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2">
          {tasks.map((task, i) => (
            <TaskCard
              key={task.sourceId}
              task={task}
              date={date}
              index={i}
              count={tasks.length}
              compact={compact}
              onMove={(dir) => save(moveBy(tasks, i, dir))}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

const screenReaderInstructions = {
  draggable:
    'Para reordenar, presiona Espacio o Enter. Usa las flechas arriba y abajo para mover la tarea, Espacio o Enter para soltarla, o Escape para cancelar.',
}

function announcements(tasks: AgendaTask[]): Announcements {
  const title = (id: string | number) => tasks.find((t) => t.sourceId === id)?.title ?? 'la tarea'
  const pos = (id: string | number) => tasks.findIndex((t) => t.sourceId === id) + 1
  return {
    onDragStart: ({ active }) => `Tomaste ${title(active.id)}, posición ${pos(active.id)} de ${tasks.length}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${title(active.id)} está en la posición ${pos(over.id)} de ${tasks.length}.`
        : `${title(active.id)} fuera de la lista.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `Soltaste ${title(active.id)} en la posición ${pos(over.id)} de ${tasks.length}.`
        : `Soltaste ${title(active.id)}.`,
    onDragCancel: ({ active }) => `Cancelado. ${title(active.id)} volvió a su lugar.`,
  }
}
