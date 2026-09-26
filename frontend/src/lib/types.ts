export type CalendarColor = 'blue' | 'violet' | 'amber' | 'emerald' | 'rose' | 'zinc'

export interface User {
  id: string
  name: string
  email: string
}

export interface Calendar {
  id: string
  name: string
  color: CalendarColor
  visible: boolean
}

export interface CalendarEvent {
  id: string
  calendarId: string
  title: string
  notes?: string
  /** Hora local sin zona: "2026-09-21T09:00" */
  start: string
  end: string
  rrule: string | null
  exdates: string[]
  checkable: boolean
}

export interface Task {
  id: string
  calendarId: string
  title: string
  startDate: string
  rrule: string
  exdates: string[]
}

export interface AgendaTask {
  sourceType: 'task'
  sourceId: string
  calendarId: string
  color: CalendarColor
  title: string
  done: boolean
}

export interface AgendaEvent {
  sourceType: 'event'
  sourceId: string
  calendarId: string
  color: CalendarColor
  title: string
  notes?: string
  start: string
  end: string
  recurring: boolean
  checkable: boolean
  done: boolean
}

export interface AgendaDay {
  date: string
  progress: { done: number; total: number }
  tasks: AgendaTask[]
  events: AgendaEvent[]
}

export interface AgendaRange {
  from: string
  to: string
  days: AgendaDay[]
}
