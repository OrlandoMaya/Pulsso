import { describe, expect, it } from 'vitest'
import { layoutOverlaps, pairRows } from './overlap'

const ev = (id: string, s: string, e: string) => ({ id, start: `2026-09-21T${s}`, end: `2026-09-21T${e}` })

describe('layoutOverlaps', () => {
  it('eventos separados ocupan todo el ancho', () => {
    const r = layoutOverlaps([ev('a', '09:00', '10:00'), ev('b', '10:00', '11:00')])
    expect(r.map((p) => [p.item.id, p.lane, p.lanes])).toEqual([
      ['a', 0, 1],
      ['b', 0, 1],
    ])
  })

  it('dos eventos a la misma hora van en dos columnas', () => {
    const r = layoutOverlaps([ev('a', '09:00', '09:30'), ev('b', '09:00', '10:00')])
    expect(r.map((p) => [p.item.id, p.lane, p.lanes])).toEqual([
      ['b', 0, 2],
      ['a', 1, 2],
    ])
  })

  it('reutiliza columnas libres dentro del mismo grupo', () => {
    const r = layoutOverlaps([ev('largo', '09:00', '12:00'), ev('x', '09:00', '10:00'), ev('y', '10:30', '11:00')])
    expect(r.map((p) => [p.item.id, p.lane, p.lanes])).toEqual([
      ['largo', 0, 2],
      ['x', 1, 2],
      ['y', 1, 2],
    ])
  })

  it('cada grupo tiene su propio ancho', () => {
    const r = layoutOverlaps([ev('a', '09:00', '10:00'), ev('b', '09:30', '10:30'), ev('c', '15:00', '16:00')])
    expect(r.find((p) => p.item.id === 'c')).toMatchObject({ lane: 0, lanes: 1 })
    expect(r.find((p) => p.item.id === 'b')).toMatchObject({ lane: 1, lanes: 2 })
  })
})

describe('pairRows', () => {
  it('junta en una fila los eventos que se cruzan', () => {
    const rows = pairRows([
      ev('a', '07:30', '08:30'),
      ev('b', '09:00', '09:30'),
      ev('c', '09:00', '10:00'),
      ev('d', '15:00', '16:00'),
    ])
    expect(rows.map((r) => r.map((e) => e.id))).toEqual([['a'], ['b', 'c'], ['d']])
  })
})
