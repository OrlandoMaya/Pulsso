import { Frequency, RRule } from 'rrule';
import { addDays, parseDate, toDateKey } from '../common/utils/date';

// Frecuencias menores a un día generarían miles de ocurrencias: no se permiten
const ALLOWED_FREQ = [Frequency.YEARLY, Frequency.MONTHLY, Frequency.WEEKLY, Frequency.DAILY];

/** Construye la regla a partir de "FREQ=WEEKLY;BYDAY=MO,WE" usando `dtstart` como inicio. */
export function buildRRule(rule: string, dtstart: Date): RRule {
  const text = rule.trim().replace(/^RRULE:/i, '');
  if (!text || /DTSTART|RDATE|EXDATE|EXRULE|[\r\n]/i.test(text)) {
    throw new Error('Regla de repetición inválida');
  }
  const options = RRule.parseString(text);
  if (options.freq === undefined || !ALLOWED_FREQ.includes(options.freq)) {
    throw new Error('FREQ debe ser DAILY, WEEKLY, MONTHLY o YEARLY');
  }
  return new RRule({ ...options, dtstart });
}

export function isValidRRule(rule: string): boolean {
  try {
    buildRRule(rule, new Date(Date.UTC(2000, 0, 1)));
    return true;
  } catch {
    return false;
  }
}

export interface EventLike {
  start: Date;
  end: Date;
  rrule?: string | null;
  exdates?: string[];
}

export interface TaskLike {
  startDate: string;
  rrule: string;
  exdates?: string[];
}

/** Ocurrencias de un evento que se cruzan con [from, to). */
export function expandEvent(event: EventLike, from: Date, to: Date): { start: Date; end: Date }[] {
  const duration = event.end.getTime() - event.start.getTime();
  const overlaps = (s: Date) => s < to && s.getTime() + duration > from.getTime();

  if (!event.rrule) {
    return overlaps(event.start) ? [{ start: event.start, end: event.end }] : [];
  }
  const skip = new Set(event.exdates ?? []);
  return buildRRule(event.rrule, event.start)
    .between(new Date(from.getTime() - duration), to, true)
    .filter((s) => overlaps(s) && !skip.has(toDateKey(s)))
    .map((s) => ({ start: s, end: new Date(s.getTime() + duration) }));
}

/** Días (YYYY-MM-DD) en [from, to) en que toca una tarea recurrente. */
export function expandTask(task: TaskLike, from: Date, to: Date): string[] {
  const skip = new Set(task.exdates ?? []);
  return buildRRule(task.rrule, parseDate(task.startDate))
    .between(from, new Date(to.getTime() - 1), true)
    .map(toDateKey)
    .filter((d) => !skip.has(d));
}

/** ¿El evento tiene una ocurrencia que empieza ese día? */
export function eventOccursOn(event: EventLike, date: string): boolean {
  const day = parseDate(date);
  return expandEvent(event, day, addDays(day, 1)).some((o) => toDateKey(o.start) === date);
}

export function taskOccursOn(task: TaskLike, date: string): boolean {
  const day = parseDate(date);
  return expandTask(task, day, addDays(day, 1)).includes(date);
}
