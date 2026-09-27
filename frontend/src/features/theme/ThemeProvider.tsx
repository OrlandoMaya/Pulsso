import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext, type Theme } from './theme-context'

const STORAGE_KEY = 'pulsso.theme'
const media = () => window.matchMedia('(prefers-color-scheme: dark)')

function readStored(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStored)
  const [systemDark, setSystemDark] = useState(() => media().matches)

  // Sigue al sistema cuando el tema es "system"
  useEffect(() => {
    const mq = media()
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolved === 'dark')
    root.style.colorScheme = resolved
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', resolved === 'dark' ? '#09090b' : '#ffffff')
  }, [resolved])

  const value = useMemo(
    () => ({
      theme,
      resolved,
      setTheme: (t: Theme) => {
        setThemeState(t)
        try {
          if (t === 'system') localStorage.removeItem(STORAGE_KEY)
          else localStorage.setItem(STORAGE_KEY, t)
        } catch {
          // sin almacenamiento: el tema dura solo esta visita
        }
      },
    }),
    [theme, resolved],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
