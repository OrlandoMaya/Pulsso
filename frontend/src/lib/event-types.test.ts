import { describe, expect, it } from 'vitest'
import { toPayload, typeOf, type EventFormValues } from './event-types'
import type { CalendarEvent } from './types'

const base: EventFormValues = {
  type: 'normal',
  timed: true,
  title: '  Demo  ',
  calendarId: 'c1',
  date: '2026-09-24',
  startTime: '10:00',
  endTime: '11:30',
  repeat: 'none',
  days: ['TH'],
  until: '',
  checkable: false,
  yearly: false,
  notes: '',
}

const ev = (p: Partial<CalendarEvent>): CalendarEvent => ({
  id: 'e',
  calendarId: 'c1',
  title: 'x',
  start: '2026-09-24T10:00',
  end: '2026-09-24T11:00',
  rrule: null,
  exdates: [],
  checkable: false,
  allDay: false,
  ...p,
})

describe('typeOf', () => {
  it('detecta cada tipo', () => {
    expect(typeOf(ev({}))).toEqual({ type: 'normal', timed: true })
    expect(typeOf(ev({ rrule: 'FREQ=DAILY' }))).toEqual({ type: 'recurring', timed: true })
    expect(typeOf(ev({ allDay: true, rrule: 'FREQ=YEARLY' }))).toEqual({ type: 'special', timed: true })
    expect(
      typeOf(undefined, {
        id: 't',
        calendarId: 'c',
        title: 't',
        startDate: '2026-09-01',
        rrule: 'FREQ=DAILY',
        exdates: [],
      }),
    ).toEqual({ type: 'recurring', timed: false })
  })
})

describe('toPayload', () => {
  it('normal: con horas y sin repetición', () => {
    expect(toPayload(base)).toEqual({
      kind: 'event',
      data: {
        title: 'Demo',
        calendarId: 'c1',
        start: '2026-09-24T10:00',
        end: '2026-09-24T11:30',
        allDay: false,
        rrule: null,
        checkable: false,
        notes: undefined,
      },
    })
  })

  it('recurrente con horario: evento con regla', () => {
    const p = toPayload({ ...base, type: 'recurring', repeat: 'weekdays', checkable: true })
    expect(p.kind).toBe('event')
    expect(p.data).toMatchObject({ rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', checkable: true, allDay: false })
  })

  it('recurrente sin horario: tarea diaria', () => {
    expect(toPayload({ ...base, type: 'recurring', timed: false, repeat: 'daily' })).toEqual({
      kind: 'task',
      data: { title: 'Demo', calendarId: 'c1', startDate: '2026-09-24', rrule: 'FREQ=DAILY' },
    })
  })

  it('especial: día completo, anual opcional, sin casilla', () => {
    expect(toPayload({ ...base, type: 'special', yearly: true, checkable: true }).data).toMatchObject({
      start: '2026-09-24T00:00',
      allDay: true,
      rrule: 'FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=24',
      checkable: false,
    })
    expect(toPayload({ ...base, type: 'special' }).data).toMatchObject({ rrule: null })
  })
})
