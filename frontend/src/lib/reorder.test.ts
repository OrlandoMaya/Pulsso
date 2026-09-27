import { describe, expect, it } from 'vitest'
import { moveBy } from './reorder'

describe('moveBy', () => {
  it('sube y baja', () => {
    expect(moveBy(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c'])
    expect(moveBy(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b'])
  })
  it('no se sale de los bordes', () => {
    const list = ['a', 'b']
    expect(moveBy(list, 0, -1)).toBe(list)
    expect(moveBy(list, 1, 1)).toBe(list)
  })
})
