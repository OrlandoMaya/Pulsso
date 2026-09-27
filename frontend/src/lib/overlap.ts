export interface Timed {
  start: string
  end: string
}

export interface Placed<T> {
  item: T
  /** Columna dentro del grupo (0, 1, …) */
  lane: number
  /** Columnas del grupo de eventos que se cruzan */
  lanes: number
}

/**
 * Reparte los eventos de un día en columnas: los que se cruzan en hora
 * quedan lado a lado. Cada grupo conectado de traslapes usa su propio ancho.
 */
export function layoutOverlaps<T extends Timed>(items: T[]): Placed<T>[] {
  const sorted = [...items].sort((a, b) => a.start.localeCompare(b.start) || b.end.localeCompare(a.end))
  const result: Placed<T>[] = []
  let group: Placed<T>[] = []
  let laneEnds: string[] = []
  let groupEnd = ''

  const closeGroup = () => {
    for (const p of group) p.lanes = laneEnds.length
    result.push(...group)
    group = []
    laneEnds = []
  }

  for (const item of sorted) {
    if (group.length && item.start >= groupEnd) closeGroup()
    let lane = laneEnds.findIndex((end) => end <= item.start)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = item.end
    group.push({ item, lane, lanes: 1 })
    groupEnd = item.end > groupEnd || group.length === 1 ? item.end : groupEnd
  }
  if (group.length) closeGroup()
  return result
}

/**
 * Filas para la vista mensual: dos eventos que se cruzan comparten fila.
 */
export function pairRows<T extends Timed>(items: T[]): T[][] {
  const sorted = [...items].sort((a, b) => a.start.localeCompare(b.start))
  const rows: T[][] = []
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    if (b && b.start < a.end) {
      rows.push([a, b])
      i++
    } else {
      rows.push([a])
    }
  }
  return rows
}
