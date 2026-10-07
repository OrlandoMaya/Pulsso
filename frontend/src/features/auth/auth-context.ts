import { createContext, useContext } from 'react'
import type { User } from '@/lib/types'

export interface AuthState {
  status: 'loading' | 'authenticated' | 'anonymous'
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  /** Cambia la contraseña con el token del correo y abre sesión */
  resetPassword: (token: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
