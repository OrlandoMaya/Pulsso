import { createContext, useContext } from 'react'
import type { CalendarColor, NodeStatus } from '@/lib/types'

export interface DiagramState {
  /** Estado del flujo de cada elemento (inicio, decisión y fin se calculan) */
  flow: Map<string, NodeStatus>
  /** Color de la categoría del proyecto */
  color?: CalendarColor
  /** Cambia el estado de una actividad (clic en su círculo) */
  setStatus: (id: string, status: NodeStatus) => void
}

export const DiagramContext = createContext<DiagramState | null>(null)

export function useDiagram() {
  const ctx = useContext(DiagramContext)
  if (!ctx) throw new Error('useDiagram debe usarse dentro del lienzo del proyecto')
  return ctx
}
