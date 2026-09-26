import { useState } from 'react'
import { addMonths, format, isSameDay, isSameMonth, isToday, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { capitalize, eachDay, visibleRange, type View } from '@/lib/dates'
import { cn } from '@/lib/utils'

const DOW = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

export function MiniCalendar({ view, date, onSelect }: { view: View; date: Date; onSelect: (d: Date) => void }) {
  const [month, setMonth] = useState(() => startOfMonth(date))
  // Si cambia la fecha seleccionada, el mini calendario salta a su mes
  const [shownFor, setShownFor] = useState(date)
  if (shownFor !== date) {
    setShownFor(date)
    setMonth(startOfMonth(date))
  }

  const grid = visibleRange('mes', month)
  const selected = visibleRange(view, date)

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="pl-1 text-sm font-medium">{capitalize(format(month, 'LLLL yyyy', { locale: es }))}</span>
        <div className="flex gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Mes anterior"
            onClick={() => setMonth((m) => addMonths(m, -1))}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Mes siguiente"
            onClick={() => setMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {DOW.map((d) => (
          <span key={d} className="py-1 text-xs text-muted-foreground">
            {d}
          </span>
        ))}
        {eachDay(grid.start, grid.end).map((d) => {
          const inRange = view === 'semana' && d >= selected.start && d <= selected.end
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onSelect(d)}
              aria-label={format(d, "EEEE d 'de' LLLL", { locale: es })}
              className={cn(
                'h-8 cursor-pointer rounded-md text-[13px] transition-colors hover:bg-accent',
                !isSameMonth(d, month) && 'text-muted-foreground/60',
                inRange && 'bg-muted',
                isSameDay(d, date) && view === 'semana' && 'font-semibold',
                isToday(d) && 'bg-primary font-semibold text-primary-foreground hover:bg-primary/90',
              )}
            >
              {format(d, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
