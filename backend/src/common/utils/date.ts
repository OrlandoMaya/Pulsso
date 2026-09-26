/**
 * El calendario trabaja con horas "flotantes" (hora de pared, sin zona):
 * "2026-09-21T09:00" se guarda como 2026-09-21T09:00Z. Así las repeticiones
 * no se corren con cambios de horario y el cliente decide qué es "hoy".
 */
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

export function parseDate(date: string): Date {
  const d = new Date(`${date}T00:00:00Z`);
  if (!DATE_RE.test(date) || Number.isNaN(d.getTime()) || toDateKey(d) !== date) {
    throw new Error(`Fecha inválida: ${date}`);
  }
  return d;
}

export function parseDateTime(value: string): Date {
  const d = new Date(`${value.length === 16 ? `${value}:00` : value}Z`);
  if (!DATETIME_RE.test(value) || Number.isNaN(d.getTime())) {
    throw new Error(`Fecha y hora inválida: ${value}`);
  }
  return d;
}

export function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function toDateTimeString(d: Date): string {
  return d.toISOString().slice(0, 16);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}
