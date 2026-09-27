import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import type { DayList } from '@/lib/types'

const STORAGE_KEY = 'pulsso.dayList'
const TO_PARAM: Record<DayList, string> = { personal: 'personal', work: 'trabajo' }

function stored(): DayList {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'personal' ? 'personal' : 'work'
  } catch {
    return 'work'
  }
}

/** Lista activa (personal / trabajo): va en la URL (?lista=trabajo) y se recuerda la última usada */
export function useDayList() {
  const [search, setSearch] = useSearchParams()
  const param = search.get('lista')
  const list: DayList = param === 'personal' ? 'personal' : param === 'trabajo' ? 'work' : stored()

  const setList = useCallback(
    (next: DayList) => {
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // sin almacenamiento: solo queda en la URL
      }
      setSearch(
        (prev) => {
          const p = new URLSearchParams(prev)
          p.set('lista', TO_PARAM[next])
          return p
        },
        { replace: true },
      )
    },
    [setSearch],
  )

  return { list, setList }
}
