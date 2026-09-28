export interface Timed {
  start: string
  end: string
}

export interface Placed<T> {
  item: T
  /** Columna dentro de su grupo (0, 1, …) */
  lane: number
  /** Columnas del grupo de eventos que empiezan casi a la vez */
  lanes: number
  /** Cuántos eventos más largos tiene debajo: se dibuja encima, un poco corrido */
  depth: number
}

/** Si empiezan con menos de esto de diferencia, van lado a lado; si no, uno encima del otro */
export const SIDE_BY_SIDE_MINUTES = 30

const minutesBetween = (a: string, b: string) => (Date.parse(`${b}:00Z`) - Date.parse(`${a}:00Z`)) / 60_000

interface Group<T> {
  start: string
  end: string
  depth: number
  laneEnds: string[]
  members: Placed<T>[]
}

/**
 * Reparte los eventos de un día como en Google Calendar:
 * - Los que empiezan casi a la vez (menos de 30 min) comparten el ancho, lado a lado.
 * - Uno que empieza más tarde, mientras otro sigue, va encima de ese, corrido a la derecha
 *   (p. ej. "Cepillarse 9–10" dentro de "Trabajo 7–16").
 */
export function layoutOverlaps<T extends Timed>(items: T[]): Placed<T>[] {
  const sorted = [...items].sort((a, b) => a.start.localeCompare(b.start) || b.end.localeCompare(a.end))
  const groups: Group<T>[] = []
  const placed: Placed<T>[] = []

  for (const item of sorted) {
    const group = groups.findLast(
      (g) => g.end > item.start && minutesBetween(g.start, item.start) < SIDE_BY_SIDE_MINUTES,
    )
    let target = group
    if (!target) {
      // Encima de todo lo que sigue en curso cuando empieza
      const under = placed.filter((p) => p.item.end > item.start)
      const depth = under.length ? Math.max(...under.map((p) => p.depth)) + 1 : 0
      target = { start: item.start, end: item.end, depth, laneEnds: [], members: [] }
      groups.push(target)
    }
    let lane = target.laneEnds.findIndex((end) => end <= item.start)
    if (lane === -1) lane = target.laneEnds.length
    target.laneEnds[lane] = item.end
    if (item.end > target.end) target.end = item.end
    const p = { item, lane, lanes: 1, depth: target.depth }
    target.members.push(p)
    placed.push(p)
  }

  for (const g of groups) for (const p of g.members) p.lanes = g.laneEnds.length
  return placed
}

/**
 * Filas para las listas (mes, día, modal): dos eventos que empiezan casi a la vez comparten fila.
 * Uno que va dentro de otro más largo tiene su propia fila.
 */
export function pairRows<T extends Timed>(items: T[]): T[][] {
  const sorted = [...items].sort((a, b) => a.start.localeCompare(b.start))
  const rows: T[][] = []
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    if (b && b.start < a.end && minutesBetween(a.start, b.start) < SIDE_BY_SIDE_MINUTES) {
      rows.push([a, b])
      i++
    } else {
      rows.push([a])
    }
  }
  return rows
}
