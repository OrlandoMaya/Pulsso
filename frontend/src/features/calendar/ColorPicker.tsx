import { Check } from 'lucide-react'
import { CALENDAR_COLORS, COLORS } from '@/lib/colors'
import type { CalendarColor } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Selector de color (categorías del calendario y de finanzas) */
export function ColorPicker({
  value,
  onChange,
  labelledBy,
}: {
  value: CalendarColor
  onChange: (c: CalendarColor) => void
  labelledBy: string
}) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="flex flex-wrap gap-2">
      {CALENDAR_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={COLORS[c].label}
          title={COLORS[c].label}
          onClick={() => onChange(c)}
          className={cn(
            'grid size-9 cursor-pointer place-items-center rounded-full ring-offset-2 ring-offset-background transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring',
            COLORS[c].dot,
            value === c && 'ring-2 ring-foreground',
          )}
        >
          {value === c && <Check className="size-4 text-white" strokeWidth={3} />}
        </button>
      ))}
    </div>
  )
}
