import {
  addDays,
  addMonths,
  addWeeks,
  differenceInMinutes,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { es } from 'date-fns/locale'

export const WEEK_OPTS = { weekStartsOn: 1 as const, locale: es }

export type View = 'semana' | 'mes'

/** "2026-09-21" */
export const toKey = (d: Date) => format(d, 'yyyy-MM-dd')

/** "2026-09-21T09:00" */
export const toLocalDateTime = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm")

/** Interpreta "2026-09-21" o "2026-09-21T09:00" como hora local */
export function fromKey(value: string): Date {
  const d = value.length > 10 ? parse(value, "yyyy-MM-dd'T'HH:mm", new Date()) : parse(value, 'yyyy-MM-dd', new Date())
  return d
}

export function parseKeyOr(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback
  const d = fromKey(value)
  return isValid(d) ? d : fallback
}

export const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes()

export const durationMinutes = (start: string, end: string) => differenceInMinutes(fromKey(end), fromKey(start))

export const hhmm = (value: string) => value.slice(11, 16).replace(/^0/, '')

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Primer y último día visibles de la vista */
export function visibleRange(view: View, date: Date) {
  if (view === 'semana') {
    return { start: startOfWeek(date, WEEK_OPTS), end: endOfWeek(date, WEEK_OPTS) }
  }
  return {
    start: startOfWeek(startOfMonth(date), WEEK_OPTS),
    end: endOfWeek(endOfMonth(date), WEEK_OPTS),
  }
}

export function shiftDate(view: View, date: Date, dir: 1 | -1) {
  return view === 'semana' ? addWeeks(date, dir) : addMonths(date, dir)
}

export function rangeTitle(view: View, date: Date) {
  if (view === 'mes') return capitalize(format(date, 'LLLL yyyy', { locale: es }))
  const { start, end } = visibleRange('semana', date)
  if (start.getMonth() === end.getMonth()) {
    return `${format(start, 'd')} – ${format(end, "d 'de' LLLL yyyy", { locale: es })}`
  }
  return `${format(start, "d 'de' LLL", { locale: es })} – ${format(end, "d 'de' LLL yyyy", { locale: es })}`
}

export function eachDay(start: Date, end: Date) {
  const days: Date[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d)
  return days
}
