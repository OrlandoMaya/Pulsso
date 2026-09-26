import { createContext, useContext } from 'react'

export type EditorTarget =
  | { mode: 'create'; kind: 'event' | 'task'; date: string; time?: string }
  | { mode: 'edit'; kind: 'event' | 'task'; id: string; date: string }

export interface CalendarActions {
  openEditor: (target: EditorTarget) => void
  openDay: (date: string) => void
}

export const CalendarActionsContext = createContext<CalendarActions | null>(null)

export function useCalendarActions() {
  const ctx = useContext(CalendarActionsContext)
  if (!ctx) throw new Error('useCalendarActions debe usarse dentro de CalendarPage')
  return ctx
}
