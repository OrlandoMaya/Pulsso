import { effectiveStatus, ScheduledLink } from './general-tasks.service';

const task = (done: boolean, oneOff = true): ScheduledLink => ({
  kind: 'task',
  id: 't',
  date: '2026-10-01',
  oneOff,
  done,
});

describe('effectiveStatus', () => {
  it('sin programar o como evento, manda lo guardado', () => {
    expect(effectiveStatus('in_progress')).toBe('in_progress');
    expect(effectiveStatus('done', { ...task(false), kind: 'event' })).toBe('done');
  });

  it('como tarea de un día, hecho = tachada en el calendario', () => {
    expect(effectiveStatus('pending', task(true))).toBe('done');
    expect(effectiveStatus('done', task(false))).toBe('pending');
    expect(effectiveStatus('in_progress', task(false))).toBe('in_progress');
  });

  it('una tarea recurrente no decide el estado', () => {
    expect(effectiveStatus('done', task(false, false))).toBe('done');
  });
});
