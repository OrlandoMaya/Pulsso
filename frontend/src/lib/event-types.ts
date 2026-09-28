import { buildRRule, ONE_OFF_RRULE, parseRRule, type RepeatKind, type WeekdayCode } from './recurrence'
import type { CalendarEvent, Task } from './types'
import { fromKey } from './dates'

/**
 * Cuatro cosas:
 * - Evento normal / Evento recurrente: ocurren en el calendario (no se tachan).
 *   Pueden ser con horario o de todo el día (cumpleaños, feriado).
 * - Tarea normal / Tarea recurrente: cosas por hacer que se tachan.
 */
export type Kind = 'event' | 'task'
export type Recurrence = 'normal' | 'recurring'
export type RepeatRule = Exclude<RepeatKind, 'none'>

interface RepeatValues {
  recurrence: Recurrence
  repeat: RepeatRule
  days: string[]
  until?: string
}

export interface EventFormValues extends RepeatValues {
  title: string
  calendarId: string
  date: string
  /** Último día (para eventos de varios días); igual a `date` si es de un día */
  endDate: string
  allDay: boolean
  startTime: string
  endTime: string
  notes?: string
}

export interface TaskFormValues extends RepeatValues {
  title: string
  description?: string
  subtasks?: { id: string; title: string }[]
  calendarId: string
  date: string
}

const ruleOf = (v: RepeatValues, date: string) =>
  v.recurrence === 'recurring'
    ? buildRRule({ kind: v.repeat, days: v.days as WeekdayCode[], until: v.until || undefined }, fromKey(date))
    : null

export type EventPayload = Omit<CalendarEvent, 'id' | 'exdates'>

/** Convierte el formulario de evento en lo que espera la API */
export function toEventPayload(v: EventFormValues): EventPayload {
  return {
    title: v.title.trim(),
    calendarId: v.calendarId,
    notes: v.notes?.trim() || undefined,
    checkable: false,
    allDay: v.allDay,
    // Todo el día: la API recibe primer y último día; si no, fecha y hora de inicio y fin
    start: v.allDay ? `${v.date}T00:00` : `${v.date}T${v.startTime}`,
    end: v.allDay ? `${v.endDate}T00:00` : `${v.endDate}T${v.endTime}`,
    rrule: ruleOf(v, v.date),
  }
}

export type TaskPayload = Omit<Task, 'id' | 'exdates' | 'position'>

/** Tarea normal = solo ese día; recurrente = con regla */
export function toTaskPayload(v: TaskFormValues): TaskPayload {
  return {
    title: v.title.trim(),
    description: v.description?.trim() ?? '',
    // Las vacías no se guardan
    subtasks: (v.subtasks ?? []).map((s) => ({ id: s.id, title: s.title.trim() })).filter((s) => s.title),
    calendarId: v.calendarId,
    startDate: v.date,
    rrule: ruleOf(v, v.date) ?? ONE_OFF_RRULE,
  }
}

/** Repetición de algo que ya existe, lista para el formulario */
export function repeatValuesOf(rrule: string | null, startDate: string): RepeatValues {
  const start = fromKey(startDate)
  if (!rrule || /COUNT=1(;|$)/.test(rrule)) {
    return { recurrence: 'normal', repeat: 'daily', days: [parseRRule(null, start).days[0]], until: '' }
  }
  const r = parseRRule(rrule, start)
  return {
    recurrence: 'recurring',
    repeat: r.kind === 'none' ? 'daily' : r.kind,
    days: r.days,
    until: r.until ?? '',
  }
}

export const isRecurringTask = (task: Task) => repeatValuesOf(task.rrule, task.startDate).recurrence === 'recurring'
