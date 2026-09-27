import { createContext, useContext } from 'react'
import type { Kind, Recurrence } from '@/lib/event-types'

/** Actividad de un proyecto que se está programando */
export interface NodeLink {
  projectId: string
  nodeId: string
}

export type EditorTarget =
  | {
      mode: 'create'
      kind: Kind
      recurrence: Recurrence
      date: string
      time?: string
      allDay?: boolean
      title?: string
      notes?: string
      link?: NodeLink
    }
  | { mode: 'edit'; kind: Kind; id: string; date: string }

export interface CalendarActions {
  openEditor: (target: EditorTarget) => void
  openDay: (date: string) => void
  /** Nueva tarea general o proyecto */
  openGeneral: (isProject: boolean) => void
}

export const CalendarActionsContext = createContext<CalendarActions | null>(null)

export function useCalendarActions() {
  const ctx = useContext(CalendarActionsContext)
  if (!ctx) throw new Error('useCalendarActions debe usarse dentro de CalendarPage')
  return ctx
}
