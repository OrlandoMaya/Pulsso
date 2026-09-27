/** Mueve el elemento `index` una posición arriba (-1) o abajo (+1). Devuelve una copia. */
export function moveBy<T>(items: T[], index: number, dir: -1 | 1): T[] {
  const target = index + dir
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return items
  const next = [...items]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
