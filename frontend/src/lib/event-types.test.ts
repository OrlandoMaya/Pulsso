import { describe, expect, it } from 'vitest'
import { repeatValuesOf, toEventPayload, toTaskPayload, type EventFormValues } from './event-types'

const ev: EventFormValues = {
  recurrence: 'normal',
  repeat: 'daily',
  days: ['TH'],
  until: '',
  title: '  Demo  ',
  calendarId: 'c1',
  date: '2026-09-24',
  endDate: '2026-09-24',
  allDay: false,
  startTime: '10:00',
  endTime: '11:30',
  notes: '',
}

describe('eventos', () => {
  it('normal con horario', () => {
    expect(toEventPayload(ev)).toEqual({
      title: 'Demo',
      calendarId: 'c1',
      notes: undefined,
      checkable: false,
      allDay: false,
      start: '2026-09-24T10:00',
      end: '2026-09-24T11:30',
      rrule: null,
    })
  })

  it('normal de todo el día (feriado)', () => {
    expect(toEventPayload({ ...ev, allDay: true })).toMatchObject({
      allDay: true,
      start: '2026-09-24T00:00',
      rrule: null,
    })
  })

  it('varios días: todo el día (vacaciones) y con horario (viaje)', () => {
    expect(toEventPayload({ ...ev, allDay: true, endDate: '2026-09-28' })).toMatchObject({
      start: '2026-09-24T00:00',
      end: '2026-09-28T00:00',
      allDay: true,
    })
    expect(toEventPayload({ ...ev, startTime: '18:00', endDate: '2026-09-27', endTime: '12:00' })).toMatchObject({
      start: '2026-09-24T18:00',
      end: '2026-09-27T12:00',
    })
  })

  it('recurrente con horario', () => {
    expect(toEventPayload({ ...ev, recurrence: 'recurring', repeat: 'weekdays' })).toMatchObject({
      rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
      allDay: false,
      checkable: false,
    })
  })

  it('recurrente de todo el día (cumpleaños)', () => {
    expect(toEventPayload({ ...ev, recurrence: 'recurring', repeat: 'yearly', allDay: true })).toMatchObject({
      allDay: true,
      start: '2026-09-24T00:00',
      rrule: 'FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=24',
    })
  })
})

describe('tareas', () => {
  const t = {
    title: ' Pagar luz ',
    calendarId: 'c1',
    date: '2026-09-24',
    days: ['TH'],
    until: '',
    repeat: 'daily' as const,
  }

  it('normal = solo ese día', () => {
    expect(toTaskPayload({ ...t, recurrence: 'normal' })).toEqual({
      title: 'Pagar luz',
      description: '',
      calendarId: 'c1',
      startDate: '2026-09-24',
      rrule: 'FREQ=DAILY;COUNT=1',
    })
  })

  it('recurrente = con regla', () => {
    expect(toTaskPayload({ ...t, recurrence: 'recurring', repeat: 'monthly' }).rrule).toBe('FREQ=MONTHLY;BYMONTHDAY=24')
    expect(toTaskPayload({ ...t, recurrence: 'recurring', repeat: 'weekly', days: ['MO', 'TH'] }).rrule).toBe(
      'FREQ=WEEKLY;BYDAY=MO,TH',
    )
  })
})

describe('repeatValuesOf', () => {
  it('lee lo que ya existe', () => {
    expect(repeatValuesOf(null, '2026-09-24').recurrence).toBe('normal')
    expect(repeatValuesOf('FREQ=DAILY;COUNT=1', '2026-09-24').recurrence).toBe('normal')
    expect(repeatValuesOf('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', '2026-09-24')).toMatchObject({
      recurrence: 'recurring',
      repeat: 'weekdays',
    })
    expect(repeatValuesOf('FREQ=DAILY;UNTIL=20261231T235959Z', '2026-09-24')).toMatchObject({ until: '2026-12-31' })
  })
})
