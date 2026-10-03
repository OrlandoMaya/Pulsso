import { describe, expect, it } from 'vitest'
import { formatMoney, niceTicks, parseAmount } from './money'

describe('parseAmount', () => {
  it.each([
    ['12', 12],
    ['12.5', 12.5],
    ['12,50', 12.5],
    ['$1,234.50', 1234.5],
    ['1.234,50', 1234.5],
    ['1,250', 1250],
    ['1.250.000', 1250000],
    [' 3,5 ', 3.5],
  ])('%s → %s', (input, expected) => expect(parseAmount(input)).toBe(expected))

  it.each(['', 'abc', '0', '-5', '1.234', '12.345,678'])('%s no es válido', (input) => {
    expect(parseAmount(input)).toBeNull()
  })
})

describe('formatMoney', () => {
  it('dos decimales y separador de miles', () => {
    expect(formatMoney(1234.5)).toBe('$1,234.50')
  })
})

describe('niceTicks', () => {
  it('marcas redondas que cubren el máximo', () => {
    expect(niceTicks(40)).toEqual([0, 10, 20, 30, 40])
    expect(niceTicks(87)).toEqual([0, 25, 50, 75, 100])
    expect(niceTicks(0)).toEqual([0])
  })
})
