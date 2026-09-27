import type { NodeType } from '@/lib/types'
import { cn } from '@/lib/utils'

export const NODE_MIME = 'application/pulsso-node'

const ITEMS: { type: NodeType; label: string; hint: string }[] = [
  { type: 'activity', label: 'Actividad', hint: 'Algo por hacer' },
  { type: 'decision', label: 'Decisión', hint: 'Dos o más caminos' },
  { type: 'start', label: 'Inicio', hint: 'Donde empieza' },
  { type: 'end', label: 'Fin', hint: 'Donde termina' },
]

function Shape({ type }: { type: NodeType }) {
  if (type === 'activity') return <span className="h-4 w-6 rounded-[5px] border-2 border-foreground/70 bg-card" />
  if (type === 'decision')
    return <span className="size-3.5 rotate-45 rounded-[2px] border-2 border-foreground/70 bg-card" />
  if (type === 'start') return <span className="size-4 rounded-full bg-foreground" />
  return (
    <span className="grid size-4 place-items-center rounded-full border-2 border-foreground">
      <span className="size-2 rounded-full bg-foreground" />
    </span>
  )
}

/** Elementos para arrastrar al lienzo (o tocar para agregarlos al centro) */
export function Palette({ onAdd, layout }: { onAdd: (type: NodeType) => void; layout: 'column' | 'bar' }) {
  return (
    <div
      role="toolbar"
      aria-label="Elementos del diagrama"
      className={cn(layout === 'column' ? 'flex flex-col gap-1.5' : 'flex gap-1')}
    >
      {ITEMS.map(({ type, label, hint }) => (
        <button
          key={type}
          type="button"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(NODE_MIME, type)
            e.dataTransfer.effectAllowed = 'move'
          }}
          onClick={() => onAdd(type)}
          title={`Arrastra al lienzo o haz clic: ${label}`}
          className={cn(
            'flex cursor-grab items-center rounded-lg border bg-card text-left shadow-xs transition-colors hover:border-flow-active/60 hover:bg-accent active:cursor-grabbing',
            layout === 'column' ? 'gap-3 px-3 py-2.5' : 'flex-col gap-1 px-2.5 py-1.5',
          )}
        >
          <span className="grid w-6 place-items-center">
            <Shape type={type} />
          </span>
          <span className="flex flex-col">
            <span className={cn('font-medium', layout === 'column' ? 'text-sm' : 'text-[11px]')}>{label}</span>
            {layout === 'column' && <span className="text-xs text-muted-foreground">{hint}</span>}
          </span>
        </button>
      ))}
    </div>
  )
}
