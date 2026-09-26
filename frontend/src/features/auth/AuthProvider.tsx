import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, setUnauthorizedHandler, tokenStore } from '@/lib/api'
import type { User } from '@/lib/types'
import { AuthContext, type AuthState } from './auth-context'

interface Session {
  accessToken: string
  user: User
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthState['status']>(() => (tokenStore.get() ? 'loading' : 'anonymous'))

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
    setStatus('anonymous')
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  // Recupera la sesión guardada
  useEffect(() => {
    if (!tokenStore.get()) return
    api<User>('/auth/me')
      .then((me) => {
        setUser(me)
        setStatus('authenticated')
      })
      .catch(logout)
  }, [logout])

  const start = useCallback(
    (session: Session) => {
      queryClient.clear()
      tokenStore.set(session.accessToken)
      setUser(session.user)
      setStatus('authenticated')
    },
    [queryClient],
  )

  const value = useMemo<AuthState>(
    () => ({
      status,
      user,
      logout,
      login: async (email, password) =>
        start(await api<Session>('/auth/login', { method: 'POST', body: { email, password } })),
      register: async (name, email, password) =>
        start(await api<Session>('/auth/register', { method: 'POST', body: { name, email, password } })),
    }),
    [status, user, logout, start],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
