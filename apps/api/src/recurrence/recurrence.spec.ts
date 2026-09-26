import { parseDate, parseDateTime, toDateKey, toDateTimeString } from '../common/utils/date';
import { eventOccursOn, expandEvent, expandTask, isValidRRule, taskOccursOn } from './recurrence';

describe('recurrence', () => {
  const week = { from: parseDate('2026-09-21'), to: parseDate('2026-09-28') };

  it('valida reglas', () => {
    expect(isValidRRule('FREQ=WEEKLY;BYDAY=MO,WE,FR')).toBe(true);
    expect(isValidRRule('RRULE:FREQ=DAILY;COUNT=5')).toBe(true);
    expect(isValidRRule('FREQ=HOURLY')).toBe(false);
    expect(isValidRRule('DTSTART:20260101T000000Z\nRRULE:FREQ=DAILY')).toBe(false);
    expect(isValidRRule('basura')).toBe(false);
  });

  it('expande un evento semanal (lun, mié, vie) en la semana', () => {
    const occ = expandEvent(
      {
        start: parseDateTime('2026-09-01T07:30'),
        end: parseDateTime('2026-09-01T08:30'),
        rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
      },
      week.from,
      week.to,
    );
    expect(occ.map((o) => toDateTimeString(o.start))).toEqual([
      '2026-09-21T07:30',
      '2026-09-23T07:30',
      '2026-09-25T07:30',
    ]);
    expect(toDateTimeString(occ[0].end)).toBe('2026-09-21T08:30');
  });

  it('respeta exdates', () => {
    const occ = expandEvent(
      {
        start: parseDateTime('2026-09-01T09:00'),
        end: parseDateTime('2026-09-01T09:30'),
        rrule: 'FREQ=DAILY',
        exdates: ['2026-09-23'],
      },
      week.from,
      week.to,
    );
    expect(occ.map((o) => toDateKey(o.start))).not.toContain('2026-09-23');
    expect(occ).toHaveLength(6);
  });

  it('incluye un evento sin repetición solo si se cruza con el rango', () => {
    const ev = { start: parseDateTime('2026-09-27T23:00'), end: parseDateTime('2026-09-28T01:00') };
    expect(expandEvent(ev, week.from, week.to)).toHaveLength(1);
    expect(expandEvent(ev, parseDate('2026-09-29'), parseDate('2026-09-30'))).toHaveLength(0);
  });

  it('expande tareas: entre semana y el día 1 de cada mes', () => {
    expect(
      expandTask({ startDate: '2026-09-01', rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' }, week.from, week.to),
    ).toEqual(['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25']);
    expect(
      expandTask({ startDate: '2026-01-01', rrule: 'FREQ=MONTHLY;BYMONTHDAY=1' }, parseDate('2026-09-01'), parseDate('2026-11-01')),
    ).toEqual(['2026-09-01', '2026-10-01']);
  });

  it('no genera ocurrencias antes del inicio de la tarea', () => {
    expect(expandTask({ startDate: '2026-09-24', rrule: 'FREQ=DAILY' }, week.from, week.to)).toEqual([
      '2026-09-24',
      '2026-09-25',
      '2026-09-26',
      '2026-09-27',
    ]);
  });

  it('eventOccursOn / taskOccursOn', () => {
    const ev = {
      start: parseDateTime('2026-09-01T09:00'),
      end: parseDateTime('2026-09-01T09:30'),
      rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
    };
    expect(eventOccursOn(ev, '2026-09-25')).toBe(true);
    expect(eventOccursOn(ev, '2026-09-26')).toBe(false);
    expect(taskOccursOn({ startDate: '2026-09-01', rrule: 'FREQ=DAILY' }, '2026-08-31')).toBe(false);
  });
});
