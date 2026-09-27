import { describe, expect, it } from 'vitest'
import { eachDay, rangeTitle, shiftDate, toKey, visibleRange } from './dates'

describe('dates', () => {
  const sat26 = new Date(2026, 8, 26)

  it('semana de lunes a domingo', () => {
    const r = visibleRange('semana', sat26)
    expect([toKey(r.start), toKey(r.end)]).toEqual(['2026-09-21', '2026-09-27'])
  })

  it('mes completo en semanas', () => {
    const r = visibleRange('mes', sat26)
    expect([toKey(r.start), toKey(r.end)]).toEqual(['2026-08-31', '2026-10-04'])
    expect(eachDay(r.start, r.end)).toHaveLength(35)
  })

  it('día', () => {
    const r = visibleRange('dia', sat26)
    expect([toKey(r.start), toKey(r.end)]).toEqual(['2026-09-26', '2026-09-26'])
    expect(toKey(shiftDate('dia', sat26, 1))).toBe('2026-09-27')
    expect(rangeTitle('dia', sat26)).toBe('Sábado 26 de septiembre 2026')
  })

  it('títulos', () => {
    expect(rangeTitle('semana', sat26)).toBe('21 – 27 de septiembre 2026')
    expect(rangeTitle('mes', sat26)).toBe('Septiembre 2026')
    expect(rangeTitle('semana', new Date(2026, 8, 30))).toBe('28 de sep – 4 de oct 2026')
  })
})
