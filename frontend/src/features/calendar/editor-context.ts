import { createContext, useContext } from 'react'
import type { EventType } from '@/lib/event-types'

export type EditorTarget =
  | { mode: 'create'; type: EventType; date: string; time?: string; timed?: boolean }
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
