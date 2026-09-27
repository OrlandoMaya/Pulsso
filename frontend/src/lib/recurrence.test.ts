import { describe, expect, it } from 'vitest'
import { buildRRule, describeRRule, parseRRule } from './recurrence'

const sat26 = new Date(2026, 8, 26, 10, 0)

describe('recurrence', () => {
  it('arma reglas desde el formulario', () => {
    expect(buildRRule({ kind: 'none', days: [] }, sat26)).toBeNull()
    expect(buildRRule({ kind: 'daily', days: [] }, sat26)).toBe('FREQ=DAILY')
    expect(buildRRule({ kind: 'weekdays', days: [] }, sat26)).toBe('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR')
    expect(buildRRule({ kind: 'weekly', days: ['FR', 'MO', 'WE'] }, sat26)).toBe('FREQ=WEEKLY;BYDAY=MO,WE,FR')
    expect(buildRRule({ kind: 'weekly', days: [] }, sat26)).toBe('FREQ=WEEKLY;BYDAY=SA')
    expect(buildRRule({ kind: 'monthly', days: [] }, sat26)).toBe('FREQ=MONTHLY;BYMONTHDAY=26')
    expect(buildRRule({ kind: 'daily', days: [], until: '2026-12-31' }, sat26)).toBe(
      'FREQ=DAILY;UNTIL=20261231T235959Z',
    )
  })

  it('lee reglas de vuelta', () => {
    expect(parseRRule('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', sat26).kind).toBe('weekdays')
    expect(parseRRule('FREQ=WEEKLY;BYDAY=MO,WE', sat26)).toMatchObject({ kind: 'weekly', days: ['MO', 'WE'] })
    expect(parseRRule('FREQ=DAILY;UNTIL=20261231T235959Z', sat26)).toMatchObject({ kind: 'daily', until: '2026-12-31' })
    expect(parseRRule(null, sat26).kind).toBe('none')
  })

  it('describe reglas en español', () => {
    expect(describeRRule(null, sat26)).toBe('No se repite')
    expect(describeRRule('FREQ=DAILY', sat26)).toBe('Todos los días')
    expect(describeRRule('FREQ=WEEKLY;BYDAY=MO,WE,FR', sat26)).toBe('Cada lunes, miércoles y viernes')
    expect(describeRRule('FREQ=WEEKLY;BYDAY=SA', sat26)).toBe('Cada sábado')
    expect(describeRRule('FREQ=MONTHLY;BYMONTHDAY=26', sat26)).toBe('El día 26 de cada mes')
    expect(describeRRule('FREQ=DAILY;COUNT=1', sat26)).toBe('Solo este día')
  })
})
