import { buildRRule, ONE_OFF_RRULE, type RepeatKind, type WeekdayCode } from './recurrence'
import type { CalendarEvent, Task } from './types'
import { fromKey } from './dates'

/**
 * Tipos de evento que ve la persona:
 * - normal: un día, con hora de inicio y de fin
 * - recurring: se repite; con horario (evento) o sin horario (tarea de la franja "Diario")
 * - special: día completo sin horas (cumpleaños, feriado); puede repetirse cada año
 */
export type EventType = 'normal' | 'recurring' | 'special'

export interface EventFormValues {
  type: EventType
  /** Solo recurrente: con horario = evento, sin horario = tarea diaria */
  timed: boolean
  title: string
  calendarId: string
  date: string
  startTime: string
  endTime: string
  repeat: RepeatKind
  days: string[]
  until?: string
  checkable: boolean
  /** Solo especial: se repite cada año en la misma fecha */
  yearly: boolean
  notes?: string
}

/** Qué tipo es algo que ya existe */
export function typeOf(event?: CalendarEvent, task?: Task): { type: EventType; timed: boolean } {
  if (task) return { type: 'recurring', timed: false }
  if (event?.allDay) return { type: 'special', timed: true }
  if (event?.rrule) return { type: 'recurring', timed: true }
  return { type: 'normal', timed: true }
}

export type Payload =
  | {
      kind: 'event'
      data: Omit<CalendarEvent, 'id' | 'exdates'>
    }
  | {
      kind: 'task'
      data: Omit<Task, 'id' | 'exdates'>
    }

/** Convierte el formulario en lo que espera la API */
export function toPayload(v: EventFormValues): Payload {
  const start = fromKey(v.date)
  const base = { title: v.title.trim(), calendarId: v.calendarId }
  const notes = v.notes?.trim() || undefined

  if (v.type === 'special') {
    return {
      kind: 'event',
      data: {
        ...base,
        start: `${v.date}T00:00`,
        end: `${v.date}T00:00`,
        allDay: true,
        rrule: v.yearly ? buildRRule({ kind: 'yearly', days: [] }, start) : null,
        checkable: false,
        notes,
      },
    }
  }

  const rrule =
    v.type === 'recurring'
      ? buildRRule({ kind: v.repeat, days: v.days as WeekdayCode[], until: v.until || undefined }, start)
      : null

  if (v.type === 'recurring' && !v.timed) {
    return { kind: 'task', data: { ...base, startDate: v.date, rrule: rrule ?? ONE_OFF_RRULE } }
  }

  return {
    kind: 'event',
    data: {
      ...base,
      start: `${v.date}T${v.startTime}`,
      end: `${v.date}T${v.endTime}`,
      allDay: false,
      rrule,
      checkable: v.checkable,
      notes,
    },
  }
}
