import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { RRule, Weekday } from 'rrule'

export type RepeatKind = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly'

export const WEEKDAYS = [
  { code: 'MO', short: 'L', long: 'lunes' },
  { code: 'TU', short: 'M', long: 'martes' },
  { code: 'WE', short: 'X', long: 'miércoles' },
  { code: 'TH', short: 'J', long: 'jueves' },
  { code: 'FR', short: 'V', long: 'viernes' },
  { code: 'SA', short: 'S', long: 'sábado' },
  { code: 'SU', short: 'D', long: 'domingo' },
] as const
export type WeekdayCode = (typeof WEEKDAYS)[number]['code']

/** Código del día de la semana de una fecha (lunes = MO) */
export const weekdayOf = (d: Date): WeekdayCode => WEEKDAYS[(d.getDay() + 6) % 7].code

export interface RepeatForm {
  kind: RepeatKind
  /** Para "weekly" */
  days: WeekdayCode[]
  /** Fin opcional (YYYY-MM-DD, inclusive) */
  until?: string
}

/** Arma el RRULE (sin DTSTART) que espera la API; null = no se repite */
export function buildRRule(form: RepeatForm, start: Date): string | null {
  let rule: string
  switch (form.kind) {
    case 'none':
      return null
    case 'daily':
      rule = 'FREQ=DAILY'
      break
    case 'weekdays':
      rule = 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'
      break
    case 'weekly': {
      const days = form.days.length ? form.days : [weekdayOf(start)]
      const ordered = WEEKDAYS.map((w) => w.code).filter((c) => days.includes(c))
      rule = `FREQ=WEEKLY;BYDAY=${ordered.join(',')}`
      break
    }
    case 'monthly':
      rule = `FREQ=MONTHLY;BYMONTHDAY=${start.getDate()}`
      break
    case 'yearly':
      rule = `FREQ=YEARLY;BYMONTH=${start.getMonth() + 1};BYMONTHDAY=${start.getDate()}`
      break
  }
  if (form.until) rule += `;UNTIL=${form.until.replaceAll('-', '')}T235959Z`
  return rule
}

/** Lee un RRULE de la API para prellenar el formulario */
export function parseRRule(rule: string | null | undefined, start: Date): RepeatForm {
  const empty: RepeatForm = { kind: 'none', days: [weekdayOf(start)] }
  if (!rule) return empty
  try {
    const o = RRule.parseString(rule)
    const until = o.until ? o.until.toISOString().slice(0, 10) : undefined
    const days = ((o.byweekday as Weekday[] | null) ?? []).map((w) => WEEKDAYS[w.weekday].code)
    if (o.freq === RRule.DAILY) return { kind: 'daily', days: empty.days, until }
    if (o.freq === RRule.WEEKLY) {
      const weekdays = ['MO', 'TU', 'WE', 'TH', 'FR']
      if (days.length === 5 && weekdays.every((d) => days.includes(d as WeekdayCode))) {
        return { kind: 'weekdays', days: empty.days, until }
      }
      return { kind: 'weekly', days: days.length ? days : empty.days, until }
    }
    if (o.freq === RRule.MONTHLY) return { kind: 'monthly', days: empty.days, until }
    if (o.freq === RRule.YEARLY) return { kind: 'yearly', days: empty.days, until }
  } catch {
    // regla desconocida: se trata como "no se repite"
  }
  return empty
}

/** Texto corto para mostrar la repetición: "Cada lunes y miércoles" */
export function describeRRule(rule: string | null | undefined, start: Date): string {
  if (!rule) return 'No se repite'
  if (/COUNT=1(;|$)/.test(rule)) return 'Solo este día'
  const f = parseRRule(rule, start)
  const until = f.until ? ` hasta el ${format(new Date(`${f.until}T12:00`), "d 'de' LLL", { locale: es })}` : ''
  switch (f.kind) {
    case 'daily':
      return `Todos los días${until}`
    case 'weekdays':
      return `Entre semana${until}`
    case 'weekly': {
      const names = WEEKDAYS.filter((w) => f.days.includes(w.code)).map((w) => w.long)
      const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names.at(-1)}` : names[0]
      return `Cada ${list}${until}`
    }
    case 'monthly':
      return `El día ${start.getDate()} de cada mes${until}`
    case 'yearly':
      return `Cada año el ${format(start, "d 'de' LLLL", { locale: es })}${until}`
    default:
      return 'Personalizado'
  }
}

/** Una tarea "solo hoy" es una tarea que se repite una sola vez */
export const ONE_OFF_RRULE = 'FREQ=DAILY;COUNT=1'
