import { createContext, useContext } from 'react'
import type { Kind, Recurrence } from '@/lib/event-types'

export type EditorTarget =
  | { mode: 'create'; kind: Kind; recurrence: Recurrence; date: string; time?: string; allDay?: boolean }
  | { mode: 'edit'; kind: Kind; id: string; date: string }

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
