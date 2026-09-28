import type { AgendaTask } from '@/lib/types'
import { cn } from '@/lib/utils'

/** "1/3": subtareas hechas, para las vistas compactas (semana y mes) */
export function SubtaskCount({ task, className }: { task: AgendaTask; className?: string }) {
  if (!task.subtasks.length) return null
  const done = task.subtasks.filter((s) => s.done).length
  return (
    <span
      className={cn('ml-auto shrink-0 font-mono text-[10px] text-muted-foreground', className)}
      title={`${done} de ${task.subtasks.length} subtareas hechas`}
    >
      {done}/{task.subtasks.length}
    </span>
  )
}
