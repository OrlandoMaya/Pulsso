import { Handle, Position, type NodeProps } from '@xyflow/react'
import { CalendarDays, Check, ListChecks, StickyNote } from 'lucide-react'
import { nextStatus, STATUS_LABEL } from '@/lib/diagram'
import { COLORS } from '@/lib/colors'
import type { NodeStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useDiagram } from './context'
import { scheduleLabel } from './schedule-label'
import type { ElementNode } from './types'

const SIDES = [
  { id: 't', position: Position.Top },
  { id: 'r', position: Position.Right },
  { id: 'b', position: Position.Bottom },
  { id: 'l', position: Position.Left },
] as const

/** Puntos para unir: aparecen al pasar el mouse o al seleccionar (siempre en táctil) */
function Handles({ className }: { className?: string }) {
  return (
    <>
      {SIDES.map((s) => (
        <Handle
          key={s.id}
          id={s.id}
          type="source"
          position={s.position}
          className={cn(
            '!size-2.5 !border-2 opacity-0 transition-opacity group-hover:opacity-100 in-[.selected]:opacity-100 pointer-coarse:opacity-100',
            className,
          )}
        />
      ))}
    </>
  )
}

export function StatusButton({ id, status, size = 'md' }: { id: string; status: NodeStatus; size?: 'md' | 'lg' }) {
  const { setStatus } = useDiagram()
  return (
    <button
      type="button"
      title={`${STATUS_LABEL[status]} · clic para cambiar`}
      aria-label={`Estado: ${STATUS_LABEL[status]}. Cambiar a ${STATUS_LABEL[nextStatus[status]]}`}
      onClick={(e) => {
        e.stopPropagation()
        setStatus(id, nextStatus[status])
      }}
      className={cn(
        'nodrag grid shrink-0 cursor-pointer place-items-center rounded-full border-2 transition-colors',
        size === 'md' ? 'size-5' : 'size-6',
        status === 'pending' && 'border-flow-ready/60 hover:border-flow-active',
        status === 'in_progress' && 'flow-heartbeat border-flow-active bg-flow-active/15',
        status === 'done' && 'border-flow-done bg-flow-done text-white dark:text-zinc-950',
      )}
    >
      {status === 'in_progress' && <span className="size-2 rounded-full bg-flow-active" />}
      {status === 'done' && <Check className="size-3" strokeWidth={3} />}
    </button>
  )
}

export function ActivityNode({ id, data, selected }: NodeProps<ElementNode>) {
  const { color } = useDiagram()
  const c = color ? COLORS[color] : null
  const status = data.status
  return (
    <div
      className={cn(
        'group w-[220px] rounded-xl border bg-card text-card-foreground shadow-sm transition-[border-color,box-shadow]',
        selected && 'ring-2 ring-flow-active/40',
        status === 'in_progress' && 'border-flow-active/70 shadow-[0_0_0_1px_var(--flow-active)]',
        status === 'done' && 'border-flow-done/50',
      )}
    >
      <div className="flex items-start gap-2.5 p-3">
        <StatusButton id={id} status={status} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span
            className={cn(
              'line-clamp-3 text-sm leading-snug font-medium break-words',
              !data.title && 'text-muted-foreground italic',
              status === 'done' && 'text-muted-foreground line-through',
            )}
          >
            {data.title || 'Sin título'}
          </span>
          {(data.scheduled || data.notes) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {data.scheduled && (
                <span
                  className={cn(
                    'flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium',
                    c ? [c.soft, c.text] : 'bg-muted',
                  )}
                >
                  {data.scheduled.kind === 'task' ? (
                    <ListChecks className="size-3" />
                  ) : (
                    <CalendarDays className="size-3" />
                  )}
                  {scheduleLabel(data.scheduled)}
                </span>
              )}
              {data.notes && <StickyNote className="size-3 text-muted-foreground" aria-label="Tiene notas" />}
            </div>
          )}
        </div>
      </div>
      <Handles />
    </div>
  )
}

export function DecisionNode({ id, data, selected }: NodeProps<ElementNode>) {
  const done = useDiagram().flow.get(id) === 'done'
  return (
    <div className="group relative grid size-[88px] place-items-center">
      <div
        className={cn(
          'absolute inset-[13px] rotate-45 rounded-[6px] border-2 bg-card shadow-sm transition-colors',
          done ? 'border-flow-done' : 'border-flow-ready/70',
          selected && 'ring-2 ring-flow-active/40',
        )}
      />
      <span className="relative text-lg font-semibold text-muted-foreground">?</span>
      <span className="pointer-events-none absolute top-1/2 right-full w-max max-w-[160px] -translate-y-1/2 rounded-md bg-background/90 px-1.5 py-0.5 text-right text-xs leading-snug font-medium">
        {data.title || <span className="text-muted-foreground italic">Decisión</span>}
      </span>
      <Handles />
    </div>
  )
}

export function StartNode({ selected }: NodeProps<ElementNode>) {
  return (
    <div className="group relative grid size-7 place-items-center">
      <div className={cn('size-7 rounded-full bg-foreground', selected && 'ring-4 ring-flow-active/40')} />
      <span className="pointer-events-none absolute bottom-full mb-1 text-[11px] font-medium text-muted-foreground">
        Inicio
      </span>
      <Handles />
    </div>
  )
}

export function EndNode({ id, selected }: NodeProps<ElementNode>) {
  const done = useDiagram().flow.get(id) === 'done'
  return (
    <div className="group relative grid size-8 place-items-center">
      <div
        className={cn(
          'grid size-8 place-items-center rounded-full border-2 border-foreground bg-card transition-colors',
          done && 'border-flow-done',
          selected && 'ring-4 ring-flow-active/40',
        )}
      >
        <div className={cn('size-4 rounded-full bg-foreground', done && 'bg-flow-done')} />
      </div>
      <span className="pointer-events-none absolute top-full mt-1 text-[11px] font-medium text-muted-foreground">
        {done ? '¡Terminado!' : 'Fin'}
      </span>
      <Handles />
    </div>
  )
}
