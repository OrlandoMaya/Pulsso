import { addMinutes, differenceInCalendarDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { fromKey, toKey } from './dates'

interface Span {
  start: string
  end: string
  allDay: boolean
}

/** Último día que ocupa (un evento que termina a las 00:00 no ocupa ese día) */
export const lastDayKey = (e: Span) => toKey(addMinutes(fromKey(e.end), -1))

export const firstDayKey = (e: Span) => e.start.slice(0, 10)

export const isMultiDay = (e: Span) => firstDayKey(e) !== lastDayKey(e)

/** Va en la fila de arriba (todo el día o varios días), no en la rejilla de horas */
export const isBanner = (e: Span) => e.allDay || isMultiDay(e)

/** "21 – 25 sep", "vie 18:00 – dom 12:00" o "Todo el día" */
export function rangeLabel(e: Span): string {
  const first = fromKey(firstDayKey(e))
  const last = fromKey(lastDayKey(e))
  if (!isMultiDay(e)) return e.allDay ? 'Todo el día' : `${e.start.slice(11, 16)} – ${e.end.slice(11, 16)}`
  if (e.allDay) {
    return first.getMonth() === last.getMonth()
      ? `${format(first, 'd')} – ${format(last, "d 'de' LLL", { locale: es })}`
      : `${format(first, "d 'de' LLL", { locale: es })} – ${format(last, "d 'de' LLL", { locale: es })}`
  }
  const f = (s: string) => `${format(fromKey(s), 'EEE d', { locale: es }).replace('.', '')} ${s.slice(11, 16)}`
  return `${f(e.start)} – ${f(e.end)}`
}

/** Qué parte del evento cae en `day`: empieza aquí, termina aquí, o sigue */
export function segmentOn(e: Span, day: string) {
  return { starts: firstDayKey(e) === day, ends: lastDayKey(e) === day }
}

export interface Bar<T> {
  event: T
  /** Columnas (0 = primer día visible) */
  from: number
  to: number
  lane: number
  /** Empezó antes / sigue después de lo visible */
  before: boolean
  after: boolean
}

/**
 * Barras para una fila de días (semana): cada evento una sola vez, recortado a los días
 * visibles y acomodado en carriles para que no se encimen.
 */
export function layoutBars<T extends Span & { sourceId: string }>(events: T[], days: string[]): Bar<T>[] {
  const first = fromKey(days[0])
  const seen = new Set<string>()
  const bars: Bar<T>[] = []
  for (const e of events) {
    const id = e.sourceId + e.start
    if (seen.has(id)) continue
    seen.add(id)
    const s = differenceInCalendarDays(fromKey(firstDayKey(e)), first)
    const t = differenceInCalendarDays(fromKey(lastDayKey(e)), first)
    if (t < 0 || s > days.length - 1) continue
    bars.push({
      event: e,
      from: Math.max(0, s),
      to: Math.min(days.length - 1, t),
      lane: 0,
      before: s < 0,
      after: t > days.length - 1,
    })
  }
  // Primero los que empiezan antes y los más largos
  bars.sort((a, b) => a.from - b.from || b.to - b.from - (a.to - a.from))
  const laneEnds: number[] = []
  for (const bar of bars) {
    let lane = laneEnds.findIndex((end) => end < bar.from)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = bar.to
    bar.lane = lane
  }
  return bars
}
