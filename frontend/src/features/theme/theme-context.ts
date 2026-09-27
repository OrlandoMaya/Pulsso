import { createContext, useContext } from 'react'

export type Theme = 'light' | 'dark' | 'system'

export interface ThemeState {
  theme: Theme
  /** Tema efectivo después de resolver "system" */
  resolved: 'light' | 'dark'
  setTheme: (t: Theme) => void
}

export const ThemeContext = createContext<ThemeState | null>(null)

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>')
  return ctx
}
