import { describe, expect, it } from 'vitest'
import { taskRepeatOf, toEventPayload, toTaskPayload, typeOf, type EventFormValues } from './event-types'
import type { CalendarEvent, Task } from './types'

const base: EventFormValues = {
  type: 'normal',
  title: '  Demo  ',
  calendarId: 'c1',
  date: '2026-09-24',
  startTime: '10:00',
  endTime: '11:30',
  repeat: 'daily',
  days: ['TH'],
  until: '',
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

const task = (rrule: string): Task => ({
  id: 't',
  calendarId: 'c1',
  title: 't',
  startDate: '2026-09-24',
  rrule,
  exdates: [],
})

describe('eventos', () => {
  it('detecta el tipo', () => {
    expect(typeOf(ev({}))).toBe('normal')
    expect(typeOf(ev({ rrule: 'FREQ=DAILY' }))).toBe('recurring')
    expect(typeOf(ev({ allDay: true, rrule: 'FREQ=YEARLY' }))).toBe('special')
  })

  it('normal: con horas, sin repetición, nunca tachable', () => {
    expect(toEventPayload(base)).toEqual({
      title: 'Demo',
      calendarId: 'c1',
      notes: undefined,
      checkable: false,
      start: '2026-09-24T10:00',
      end: '2026-09-24T11:30',
      allDay: false,
      rrule: null,
    })
  })

  it('recurrente: con horas y regla', () => {
    expect(toEventPayload({ ...base, type: 'recurring', repeat: 'weekdays' })).toMatchObject({
      rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
      checkable: false,
      allDay: false,
    })
  })

  it('especial: día completo, anual opcional', () => {
    expect(toEventPayload({ ...base, type: 'special', yearly: true })).toMatchObject({
      start: '2026-09-24T00:00',
      allDay: true,
      rrule: 'FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=24',
    })
    expect(toEventPayload({ ...base, type: 'special' }).rrule).toBeNull()
  })
})

describe('tareas', () => {
  const t = { title: ' Pagar luz ', calendarId: 'c1', date: '2026-09-24', days: ['TH'], until: '' }

  it('solo un día o repetidas', () => {
    expect(toTaskPayload({ ...t, repeat: 'once' })).toEqual({
      title: 'Pagar luz',
      calendarId: 'c1',
      startDate: '2026-09-24',
      rrule: 'FREQ=DAILY;COUNT=1',
    })
    expect(toTaskPayload({ ...t, repeat: 'monthly' }).rrule).toBe('FREQ=MONTHLY;BYMONTHDAY=24')
    expect(toTaskPayload({ ...t, repeat: 'weekly', days: ['MO', 'TH'] }).rrule).toBe('FREQ=WEEKLY;BYDAY=MO,TH')
  })

  it('lee la repetición de vuelta', () => {
    expect(taskRepeatOf(task('FREQ=DAILY;COUNT=1')).repeat).toBe('once')
    expect(taskRepeatOf(task('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR')).repeat).toBe('weekdays')
    expect(taskRepeatOf(task('FREQ=DAILY;UNTIL=20261231T235959Z'))).toMatchObject({
      repeat: 'daily',
      until: '2026-12-31',
    })
  })
})
