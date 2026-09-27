import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

const STORAGE_KEY = 'pulsso.dayCategory'
export const ALL = 'todas'

function stored() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ALL
  } catch {
    return ALL
  }
}

/** Categoría que filtra la lista del día: va en la URL (?categoria=<id>) y se recuerda la última */
export function useCategoryFilter() {
  const [search, setSearch] = useSearchParams()
  const filter = search.get('categoria') ?? stored()

  const setFilter = useCallback(
    (next: string) => {
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // sin almacenamiento: solo queda en la URL
      }
      setSearch(
        (prev) => {
          const p = new URLSearchParams(prev)
          p.set('categoria', next)
          return p
        },
        { replace: true },
      )
    },
    [setSearch],
  )

  return { filter, setFilter }
}
