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
  /** Evento especial de día completo */
  allDay: boolean
  /** Programado desde un elemento de un proyecto */
  projectId?: string | null
  nodeId?: string | null
}

export interface Task {
  id: string
  calendarId: string
  title: string
  description?: string
  startDate: string
  rrule: string
  exdates: string[]
  position?: number
  projectId?: string | null
  nodeId?: string | null
  subtasks?: Subtask[]
}

/** Paso de una tarea */
export interface Subtask {
  id: string
  title: string
}

export interface AgendaTask {
  sourceType: 'task'
  sourceId: string
  calendarId: string
  color: CalendarColor
  title: string
  description: string
  /** false = tarea normal (solo ese día) */
  recurring: boolean
  position: number
  done: boolean
  /** Subtareas con su estado ese día */
  subtasks: (Subtask & { done: boolean })[]
  /** Viene de un proyecto */
  project?: ProjectRef | null
}

export interface ProjectRef {
  id: string
  title: string
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
  allDay: boolean
  checkable: boolean
  done: boolean
  project?: ProjectRef | null
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

/* ─────────── Tareas generales y proyectos ─────────── */

export type NodeType = 'start' | 'activity' | 'decision' | 'end'
export type NodeStatus = 'pending' | 'in_progress' | 'done'

/** Lo que el calendario tiene de una actividad */
export interface ScheduledLink {
  kind: 'task' | 'event'
  id: string
  date: string
  start?: string
  end?: string
  allDay?: boolean
  oneOff: boolean
  done: boolean
}

export interface ProjectNode {
  id: string
  type: NodeType
  title: string
  notes: string
  x: number
  y: number
  status: NodeStatus
  scheduled?: ScheduledLink | null
}

export interface ProjectEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  label: string
}

export interface ProjectProgress {
  done: number
  inProgress: number
  total: number
}

/** Algo por hacer sin día fijo; si es proyecto, tiene diagrama de actividades */
export interface GeneralTask {
  id: string
  calendarId: string
  title: string
  description: string
  done: boolean
  isProject: boolean
  position: number
  progress?: ProjectProgress
}

export interface Project extends GeneralTask {
  nodes: ProjectNode[]
  edges: ProjectEdge[]
  progress: ProjectProgress
}
