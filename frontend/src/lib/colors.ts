import type { CalendarColor } from './types'

/** Clases por color de calendario (fondo suave, texto, barra/punto) */
export const COLORS: Record<CalendarColor, { soft: string; text: string; bar: string; dot: string; label: string }> = {
  blue: {
    soft: 'bg-blue-50 dark:bg-blue-500/15',
    text: 'text-blue-900 dark:text-blue-100',
    bar: 'border-blue-500',
    dot: 'bg-blue-500',
    label: 'Azul',
  },
  violet: {
    soft: 'bg-violet-50 dark:bg-violet-500/15',
    text: 'text-violet-900 dark:text-violet-100',
    bar: 'border-violet-500',
    dot: 'bg-violet-500',
    label: 'Violeta',
  },
  amber: {
    soft: 'bg-amber-50 dark:bg-amber-500/15',
    text: 'text-amber-900 dark:text-amber-100',
    bar: 'border-amber-500',
    dot: 'bg-amber-500',
    label: 'Ámbar',
  },
  emerald: {
    soft: 'bg-emerald-50 dark:bg-emerald-500/15',
    text: 'text-emerald-900 dark:text-emerald-100',
    bar: 'border-emerald-500',
    dot: 'bg-emerald-500',
    label: 'Verde',
  },
  rose: {
    soft: 'bg-rose-50 dark:bg-rose-500/15',
    text: 'text-rose-900 dark:text-rose-100',
    bar: 'border-rose-500',
    dot: 'bg-rose-500',
    label: 'Rosa',
  },
  zinc: {
    soft: 'bg-zinc-100 dark:bg-zinc-500/15',
    text: 'text-zinc-900 dark:text-zinc-100',
    bar: 'border-zinc-500',
    dot: 'bg-zinc-500',
    label: 'Gris',
  },
}

export const CALENDAR_COLORS = Object.keys(COLORS) as CalendarColor[]
