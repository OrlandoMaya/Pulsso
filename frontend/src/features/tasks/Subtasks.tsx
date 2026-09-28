import { useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { shortId } from '@/lib/diagram'
import type { AgendaTask } from '@/lib/types'
import { cn } from '@/lib/utils'
import { usePatchTask, useToggleSubtask } from '../calendar/queries'

/** Subtareas de una tarea en un día: se tachan, se editan en línea y se agregan aquí mismo */
export function Subtasks({ task, date, compact = false }: { task: AgendaTask; date: string; compact?: boolean }) {
  const patch = usePatchTask()
  const toggle = useToggleSubtask()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const addRef = useRef<HTMLInputElement>(null)

  const save = (subtasks: { id: string; title: string }[]) => patch.mutate({ id: task.sourceId, patch: { subtasks } })
  const list = task.subtasks.map(({ id, title }) => ({ id, title }))

  const add = () => {
    const title = draft.trim()
    if (!title) return
    save([...list, { id: shortId('s'), title }])
    setDraft('')
    addRef.current?.focus()
  }

  return (
    <div className="flex flex-col gap-0.5">
      {task.subtasks.length > 0 && (
        <ul className="flex flex-col" aria-label={`Subtareas de ${task.title}`}>
          {task.subtasks.map((s) => (
            <SubtaskRow
              key={s.id}
              title={s.title}
              done={s.done}
              compact={compact}
              onToggle={(done) => toggle.mutate({ taskId: task.sourceId, subtaskId: s.id, date, done })}
              onRename={(title) => save(list.map((x) => (x.id === s.id ? { ...x, title } : x)))}
              onRemove={() => save(list.filter((x) => x.id !== s.id))}
            />
          ))}
        </ul>
      )}
      {adding ? (
        <div className="flex h-7 items-center gap-2 pl-0.5">
          <Plus className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            ref={addRef}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
              if (e.key === 'Escape') {
                setDraft('')
                setAdding(false)
              }
            }}
            onBlur={() => {
              add()
              setAdding(false)
            }}
            maxLength={120}
            placeholder="Nueva subtarea (Enter para agregar)"
            aria-label="Nueva subtarea"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={cn(
            'flex h-6 w-fit cursor-pointer items-center gap-1.5 rounded-sm pl-0.5 text-xs text-muted-foreground/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
            // Sin subtareas, el botón aparece al pasar el mouse (siempre en táctil)
            task.subtasks.length === 0 &&
              'sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100 pointer-coarse:opacity-100',
          )}
        >
          <Plus className="size-3.5" />
          Agregar subtarea
        </button>
      )}
    </div>
  )
}

function SubtaskRow({
  title,
  done,
  compact,
  onToggle,
  onRename,
  onRemove,
}: {
  title: string
  done: boolean
  compact: boolean
  onToggle: (done: boolean) => void
  onRename: (title: string) => void
  onRemove: () => void
}) {
  const [value, setValue] = useState(title)
  const [synced, setSynced] = useState(title)
  if (synced !== title) {
    setSynced(title)
    setValue(title)
  }

  const commit = () => {
    const t = value.trim()
    if (!t) return setValue(title)
    if (t !== title) onRename(t)
  }

  return (
    <li className="group/sub flex min-h-7 items-center gap-2 pl-0.5">
      <Checkbox
        checked={done}
        aria-label={`${done ? 'Desmarcar' : 'Marcar'} ${title}`}
        className="size-3.5 bg-background"
        onCheckedChange={(v) => onToggle(v === true)}
      />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            setValue(title)
            e.currentTarget.blur()
          }
        }}
        maxLength={120}
        aria-label="Subtarea"
        className={cn(
          'min-w-0 flex-1 rounded-sm bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
          compact ? 'text-[13px]' : 'text-sm',
          done && 'text-muted-foreground line-through',
        )}
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar ${title}`}
        className="grid size-5 shrink-0 cursor-pointer place-items-center rounded text-muted-foreground opacity-100 hover:text-foreground focus-visible:opacity-100 sm:opacity-0 sm:group-hover/sub:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </li>
  )
}
