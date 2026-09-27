import { Sparkles } from 'lucide-react'
import { COLORS } from '@/lib/colors'
import { isMultiDay, rangeLabel } from '@/lib/multiday'
import type { AgendaEvent } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useCalendarActions } from './editor-context'

/**
 * Evento de todo el día o de varios días. En la semana y el mes se dibuja como barra:
 * `continuesBefore/After` quitan el borde redondeado del lado que sigue.
 */
export function SpecialChip({
  event,
  date,
  size = 'sm',
  continuesBefore = false,
  continuesAfter = false,
  hideTitle = false,
  className,
  style,
}: {
  event: AgendaEvent
  date: string
  size?: 'sm' | 'md'
  continuesBefore?: boolean
  continuesAfter?: boolean
  /** Días intermedios de una barra en el mes: solo el color */
  hideTitle?: boolean
  className?: string
  style?: React.CSSProperties
}) {
  const { openEditor } = useCalendarActions()
  const c = COLORS[event.color]
  const range = rangeLabel(event)
  const timedStart = !event.allDay && !continuesBefore ? `${event.start.slice(11, 16)} ` : ''

  return (
    <button
      type="button"
      title={`${event.title} · ${range}`}
      style={style}
      onClick={(e) => {
        e.stopPropagation()
        openEditor({ mode: 'edit', kind: 'event', id: event.sourceId, date })
      }}
      className={cn(
        'flex min-w-0 cursor-pointer items-center gap-1.5 border text-left font-medium',
        c.soft,
        c.text,
        size === 'sm' ? 'h-[22px] px-1.5 text-[11.5px]' : 'min-h-9 px-3 py-1.5 text-sm',
        continuesBefore ? 'rounded-l-none border-l-0' : 'rounded-l-md',
        continuesAfter ? 'rounded-r-none border-r-0' : 'rounded-r-md',
        className,
      )}
    >
      {!continuesBefore && <Sparkles className={cn('shrink-0', size === 'sm' ? 'size-3' : 'size-4')} aria-hidden />}
      <span className={cn('truncate', hideTitle && 'sr-only')}>
        {size === 'sm' && timedStart}
        {event.title}
      </span>
      {size === 'md' && isMultiDay(event) ? (
        <span className="ml-auto shrink-0 text-xs font-normal opacity-80">{range}</span>
      ) : (
        <span className="sr-only">, {range}</span>
      )}
    </button>
  )
}
