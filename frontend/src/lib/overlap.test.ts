import { describe, expect, it } from 'vitest'
import { layoutOverlaps, pairRows } from './overlap'

const ev = (id: string, s: string, e: string) => ({ id, start: `2026-09-21T${s}`, end: `2026-09-21T${e}` })
const summary = (r: ReturnType<typeof layoutOverlaps<ReturnType<typeof ev>>>) =>
  r.map((p) => [p.item.id, p.lane, p.lanes, p.depth])

describe('layoutOverlaps', () => {
  it('eventos separados ocupan todo el ancho', () => {
    const r = layoutOverlaps([ev('a', '09:00', '10:00'), ev('b', '10:00', '11:00')])
    expect(summary(r)).toEqual([
      ['a', 0, 1, 0],
      ['b', 0, 1, 0],
    ])
  })

  it('dos eventos a la misma hora van en dos columnas', () => {
    const r = layoutOverlaps([ev('a', '09:00', '09:30'), ev('b', '09:00', '10:00')])
    expect(summary(r)).toEqual([
      ['b', 0, 2, 0],
      ['a', 1, 2, 0],
    ])
  })

  it('un evento dentro de otro más largo va encima, no al lado', () => {
    const r = layoutOverlaps([ev('trabajo', '07:00', '16:00'), ev('cepillarse', '09:00', '10:00')])
    expect(summary(r)).toEqual([
      ['trabajo', 0, 1, 0],
      ['cepillarse', 0, 1, 1],
    ])
  })

  it('dentro de otro, los que empiezan juntos comparten el ancho', () => {
    const r = layoutOverlaps([
      ev('trabajo', '07:00', '16:00'),
      ev('x', '10:00', '11:00'),
      ev('y', '10:15', '11:30'),
      ev('z', '10:30', '10:45'),
    ])
    expect(summary(r)).toEqual([
      ['trabajo', 0, 1, 0],
      ['x', 0, 2, 1],
      ['y', 1, 2, 1],
      // Empieza 30 min después de x, que sigue: otro nivel encima
      ['z', 0, 1, 2],
    ])
  })

  it('empezar 30 min después ya es encima', () => {
    const r = layoutOverlaps([ev('a', '09:00', '10:00'), ev('b', '09:30', '10:30'), ev('c', '15:00', '16:00')])
    expect(r.find((p) => p.item.id === 'b')).toMatchObject({ lane: 0, lanes: 1, depth: 1 })
    expect(r.find((p) => p.item.id === 'c')).toMatchObject({ lane: 0, lanes: 1, depth: 0 })
  })
})

describe('pairRows', () => {
  it('junta en una fila los que empiezan casi a la vez', () => {
    const rows = pairRows([
      ev('a', '07:30', '08:30'),
      ev('b', '09:00', '09:30'),
      ev('c', '09:00', '10:00'),
      ev('d', '15:00', '16:00'),
    ])
    expect(rows.map((r) => r.map((e) => e.id))).toEqual([['a'], ['b', 'c'], ['d']])
  })

  it('uno dentro de otro más largo va en su propia fila', () => {
    const rows = pairRows([ev('trabajo', '07:00', '16:00'), ev('cepillarse', '09:00', '10:00')])
    expect(rows.map((r) => r.map((e) => e.id))).toEqual([['trabajo'], ['cepillarse']])
  })
})
