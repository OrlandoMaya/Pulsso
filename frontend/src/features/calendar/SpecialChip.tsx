import { Sparkles } from 'lucide-react'
import { COLORS } from '@/lib/colors'
import type { AgendaEvent } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useCalendarActions } from './editor-context'

/** Evento de todo el día (cumpleaños, feriado…) */
export function SpecialChip({
  event,
  date,
  size = 'sm',
  className,
}: {
  event: AgendaEvent
  date: string
  size?: 'sm' | 'md'
  className?: string
}) {
  const { openEditor } = useCalendarActions()
  const c = COLORS[event.color]
  return (
    <button
      type="button"
      title={`${event.title} · todo el día`}
      onClick={(e) => {
        e.stopPropagation()
        openEditor({ mode: 'edit', kind: 'event', id: event.sourceId, date })
      }}
      className={cn(
        'flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md border text-left font-medium',
        c.soft,
        c.text,
        size === 'sm' ? 'h-[22px] px-1.5 text-[11.5px]' : 'h-9 px-3 text-sm',
        className,
      )}
    >
      <Sparkles className={cn('shrink-0', size === 'sm' ? 'size-3' : 'size-4')} aria-label="Todo el día" />
      <span className="truncate">{event.title}</span>
    </button>
  )
}
