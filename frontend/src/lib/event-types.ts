import { buildRRule, ONE_OFF_RRULE, parseRRule, type RepeatKind, type WeekdayCode } from './recurrence'
import type { CalendarEvent, Task } from './types'
import { fromKey } from './dates'

/**
 * Eventos: cosas que ocurren en el calendario (no se tachan).
 * - normal: un día, con hora de inicio y de fin
 * - recurring: con hora, se repite (diario, lun–vie, ciertos días…)
 * - special: día completo sin horas (cumpleaños, feriado); puede repetirse cada año
 */
export type EventType = 'normal' | 'recurring' | 'special'

export interface EventFormValues {
  type: EventType
  title: string
  calendarId: string
  date: string
  startTime: string
  endTime: string
  repeat: RepeatKind
  days: string[]
  until?: string
  /** Solo especial: se repite cada año en la misma fecha */
  yearly: boolean
  notes?: string
}

/** Qué tipo es un evento que ya existe */
export function typeOf(event: CalendarEvent): EventType {
  if (event.allDay) return 'special'
  if (event.rrule) return 'recurring'
  return 'normal'
}

export type EventPayload = Omit<CalendarEvent, 'id' | 'exdates'>

/** Convierte el formulario de evento en lo que espera la API */
export function toEventPayload(v: EventFormValues): EventPayload {
  const start = fromKey(v.date)
  const base = {
    title: v.title.trim(),
    calendarId: v.calendarId,
    notes: v.notes?.trim() || undefined,
    checkable: false,
  }

  if (v.type === 'special') {
    return {
      ...base,
      start: `${v.date}T00:00`,
      end: `${v.date}T00:00`,
      allDay: true,
      rrule: v.yearly ? buildRRule({ kind: 'yearly', days: [] }, start) : null,
    }
  }
  return {
    ...base,
    start: `${v.date}T${v.startTime}`,
    end: `${v.date}T${v.endTime}`,
    allDay: false,
    rrule:
      v.type === 'recurring'
        ? buildRRule({ kind: v.repeat, days: v.days as WeekdayCode[], until: v.until || undefined }, start)
        : null,
  }
}

/** Tareas: cosas por hacer que se tachan. Solo un día o repetidas. */
export type TaskRepeat = 'once' | Exclude<RepeatKind, 'none'>

export interface TaskFormValues {
  title: string
  calendarId: string
  date: string
  repeat: TaskRepeat
  days: string[]
  until?: string
}

export type TaskPayload = Omit<Task, 'id' | 'exdates'>

export function toTaskPayload(v: TaskFormValues): TaskPayload {
  const rrule =
    v.repeat === 'once'
      ? ONE_OFF_RRULE
      : buildRRule({ kind: v.repeat, days: v.days as WeekdayCode[], until: v.until || undefined }, fromKey(v.date))
  return { title: v.title.trim(), calendarId: v.calendarId, startDate: v.date, rrule: rrule ?? ONE_OFF_RRULE }
}

/** Lee la repetición de una tarea existente */
export function taskRepeatOf(task: Task): { repeat: TaskRepeat; days: string[]; until?: string } {
  if (/COUNT=1(;|$)/.test(task.rrule)) return { repeat: 'once', days: [] }
  const r = parseRRule(task.rrule, fromKey(task.startDate))
  return { repeat: r.kind === 'none' ? 'daily' : r.kind, days: r.days, until: r.until }
}
