import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { parseKeyOr, toKey, type View } from '@/lib/dates'

/** Vista y fecha salen de la URL: /semana/2026-09-21?dia=2026-09-26 */
export function useCalendarNav(view: View) {
  const params = useParams()
  const [search, setSearch] = useSearchParams()
  const navigate = useNavigate()

  const date = useMemo(() => parseKeyOr(params.date, new Date()), [params.date])
  const openDate = search.get('dia')

  const go = useCallback((v: View, d: Date) => navigate(`/${v}/${toKey(d)}`), [navigate])
  const openDay = useCallback((key: string) => setSearch({ dia: key }), [setSearch])
  const closeDay = useCallback(() => setSearch({}), [setSearch])

  return { view, date, openDate, go, openDay, closeDay }
}

/** Fecha y hora actuales, refrescadas cada minuto */
export function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  return now
}
