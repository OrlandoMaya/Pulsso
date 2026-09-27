import { describe, expect, it } from 'vitest'
import { isBanner, isMultiDay, lastDayKey, layoutBars, rangeLabel, segmentOn } from './multiday'

const ev = (id: string, start: string, end: string, allDay = false) => ({ sourceId: id, start, end, allDay })
const week = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27']

describe('multiday', () => {
  it('detecta días', () => {
    const vac = ev('v', '2026-09-21T00:00', '2026-09-26T00:00', true)
    expect(lastDayKey(vac)).toBe('2026-09-25')
    expect(isMultiDay(vac)).toBe(true)
    expect(isMultiDay(ev('b', '2026-09-24T00:00', '2026-09-25T00:00', true))).toBe(false)
    expect(isBanner(ev('b', '2026-09-24T00:00', '2026-09-25T00:00', true))).toBe(true)
    expect(isBanner(ev('m', '2026-09-24T10:00', '2026-09-24T11:00'))).toBe(false)
    expect(isBanner(ev('t', '2026-09-25T18:00', '2026-09-27T12:00'))).toBe(true)
  })

  it('etiquetas de rango', () => {
    expect(rangeLabel(ev('v', '2026-09-21T00:00', '2026-09-26T00:00', true))).toBe('21 – 25 de sep')
    expect(rangeLabel(ev('v', '2026-09-28T00:00', '2026-10-03T00:00', true))).toBe('28 de sep – 2 de oct')
    expect(rangeLabel(ev('t', '2026-09-25T18:00', '2026-09-27T12:00'))).toBe('vie 25 18:00 – dom 27 12:00')
    expect(rangeLabel(ev('b', '2026-09-24T00:00', '2026-09-25T00:00', true))).toBe('Todo el día')
  })

  it('segmento de cada día', () => {
    const vac = ev('v', '2026-09-21T00:00', '2026-09-26T00:00', true)
    expect(segmentOn(vac, '2026-09-21')).toEqual({ starts: true, ends: false })
    expect(segmentOn(vac, '2026-09-23')).toEqual({ starts: false, ends: false })
    expect(segmentOn(vac, '2026-09-25')).toEqual({ starts: false, ends: true })
  })

  it('barras en carriles sin encimarse, recortadas a la semana', () => {
    const vac = ev('v', '2026-09-21T00:00', '2026-09-26T00:00', true)
    const trip = ev('t', '2026-09-25T18:00', '2026-09-29T12:00')
    const bday = ev('b', '2026-09-24T00:00', '2026-09-25T00:00', true)
    const prev = ev('p', '2026-09-18T00:00', '2026-09-23T00:00', true)
    // Las agendas repiten el evento en cada día: se toma una vez
    const bars = layoutBars([vac, vac, trip, bday, prev, prev], week)
    const by = Object.fromEntries(bars.map((b) => [b.event.sourceId, b]))
    expect(bars).toHaveLength(4)
    expect(by.p).toMatchObject({ from: 0, to: 1, before: true, after: false })
    expect(by.v).toMatchObject({ from: 0, to: 4 })
    expect(by.t).toMatchObject({ from: 4, to: 6, after: true })
    expect(by.v.lane).not.toBe(by.p.lane)
    expect(by.t.lane).not.toBe(by.v.lane)
    expect(by.b.lane).not.toBe(by.v.lane)
  })
})
