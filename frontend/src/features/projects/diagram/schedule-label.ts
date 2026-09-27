import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { fromKey } from '@/lib/dates'
import type { ScheduledLink } from '@/lib/types'

/** "Tarea · mié 1 oct" / "Evento · mar 30 sep, 10:00" */
export function scheduleLabel(s: ScheduledLink) {
  const day = format(fromKey(s.date), 'EEE d LLL', { locale: es }).replace('.', '')
  if (s.kind === 'task') return `Tarea · ${day}`
  return `Evento · ${day}${s.allDay || !s.start ? '' : `, ${s.start.slice(11, 16)}`}`
}
