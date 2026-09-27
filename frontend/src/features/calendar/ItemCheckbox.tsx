import { Checkbox } from '@/components/ui/checkbox'
import type { AgendaEvent, AgendaTask } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useToggleCompletion } from './queries'

/** Casilla para tachar una tarea o evento en un día concreto */
export function ItemCheckbox({
  item,
  date,
  className,
}: {
  item: AgendaTask | AgendaEvent
  date: string
  className?: string
}) {
  const toggle = useToggleCompletion()
  return (
    <Checkbox
      checked={item.done}
      aria-label={`${item.done ? 'Desmarcar' : 'Marcar'} ${item.title}`}
      className={cn('bg-background', className)}
      onClick={(e) => e.stopPropagation()}
      onCheckedChange={(v) =>
        toggle.mutate({ sourceType: item.sourceType, sourceId: item.sourceId, date, done: v === true })
      }
    />
  )
}
