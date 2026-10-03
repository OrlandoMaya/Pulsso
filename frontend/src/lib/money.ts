const money = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'USD',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const compact = new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 })

/** "$1,234.50" */
export const formatMoney = (n: number) => money.format(n)

/** "$1.2 k" para ejes y espacios chicos; montos menores a 1,000 completos sin decimales si son enteros */
export function formatMoneyShort(n: number) {
  if (Math.abs(n) >= 1000) return `$${compact.format(n)}`
  return Number.isInteger(n) ? `$${n}` : formatMoney(n)
}

/**
 * Convierte lo que escribe la persona en un monto: acepta "12.5", "12,50", "$1,234.50" o "1.234,50".
 * Devuelve null si no es un monto válido (positivo, máximo 2 decimales).
 */
export function parseAmount(input: string): number | null {
  let s = input.replace(/[\s$]/g, '')
  if (!s) return null
  const lastDot = s.lastIndexOf('.')
  const lastComma = s.lastIndexOf(',')
  if (lastDot >= 0 && lastComma >= 0) {
    // El último separador es el decimal; el otro, de miles
    const dec = lastDot > lastComma ? '.' : ','
    s = s
      .split(dec === '.' ? ',' : '.')
      .join('')
      .replace(dec, '.')
  } else if (lastComma >= 0) {
    // Solo comas: decimal si lleva 1–2 cifras al final ("12,5"); si no, de miles ("1,250")
    s = /,\d{1,2}$/.test(s) && s.split(',').length === 2 ? s.replace(',', '.') : s.split(',').join('')
  } else if (lastDot >= 0 && s.split('.').length > 2) {
    s = s.split('.').join('')
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  const n = Number(s)
  return n > 0 ? n : null
}

/** Escala de un eje: tope "redondo" y marcas limpias (0, 25, 50…) */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0]
  const raw = max / count
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)!
  const top = Math.ceil(max / step) * step
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => +(i * step).toFixed(2))
}
