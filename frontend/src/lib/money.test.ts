import { describe, expect, it } from 'vitest'
import { formatMoney, formatTyping, niceTicks, parseAmount } from './money'

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

describe('formatTyping', () => {
  it.each([
    ['1234', '1,234'],
    ['1234567.8', '1,234,567.8'],
    ['1,23,4', '1,234'],
    ['12.345', '12.34'],
    ['1.2.3', '1.23'],
    ['007', '7'],
    ['.5', '0.5'],
    ['$ 2500abc', '2,500'],
    ['', ''],
  ])('%s → %s', (raw, value) => expect(formatTyping(raw).value).toBe(value))

  it('el cursor se queda después del mismo dígito', () => {
    // Escribiendo un 5 en medio: "1,2|34" → "12,5|34"
    expect(formatTyping('1,2534', 4)).toEqual({ value: '12,534', caret: 4 })
    // Al final, el cursor sigue al final
    expect(formatTyping('12345', 5)).toEqual({ value: '12,345', caret: 6 })
  })

  it('al leerlo vuelve a ser el número', () => {
    expect(parseAmount(formatTyping('1234567.89').value)).toBe(1234567.89)
  })
})
