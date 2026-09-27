import { BadRequestException, Injectable } from '@nestjs/common';
import { CalendarsService } from '../calendars/calendars.service';
import { addDays, parseDate, toDateKey, toDateTimeString } from '../common/utils/date';
import { CompletionsService } from '../completions/completions.service';
import { EventsService } from '../events/events.service';
import { expandEvent, expandTask } from '../recurrence/recurrence';
import { TasksService } from '../tasks/tasks.service';

const MAX_RANGE_DAYS = 62;

export interface AgendaTask {
  sourceType: 'task';
  sourceId: string;
  calendarId: string;
  color: string;
  title: string;
  description: string;
  /** false = tarea normal (solo ese día) */
  recurring: boolean;
  position: number;
  done: boolean;
}

export interface AgendaEvent {
  sourceType: 'event';
  sourceId: string;
  calendarId: string;
  color: string;
  title: string;
  notes?: string;
  start: string;
  end: string;
  recurring: boolean;
  allDay: boolean;
  checkable: boolean;
  done: boolean;
}

export interface AgendaDay {
  date: string;
  progress: { done: number; total: number };
  tasks: AgendaTask[];
  events: AgendaEvent[];
}

@Injectable()
export class AgendaService {
  constructor(
    private readonly calendars: CalendarsService,
    private readonly events: EventsService,
    private readonly tasks: TasksService,
    private readonly completions: CompletionsService,
  ) {}

  async range(userId: string, fromKey: string, toKey: string, calendarIds?: string[]) {
    const { from, to } = this.parseRange(fromKey, toKey);

    const userCalendars = await this.calendars.findAll(userId);
    const selected = userCalendars.filter((c) =>
      calendarIds ? calendarIds.includes(c.id) : c.visible,
    );
    const colorOf = new Map(selected.map((c) => [c.id, c.color as string]));
    const ids = [...colorOf.keys()];

    const [events, tasks, done] = await Promise.all([
      this.events.findCandidates(userId, from, to, ids),
      this.tasks.findCandidates(userId, to, ids),
      this.completions.doneByDate(userId, fromKey, toDateKey(to)),
    ]);

    const days = new Map<string, AgendaDay>();
    for (let d = from; d < to; d = addDays(d, 1)) {
      days.set(toDateKey(d), {
        date: toDateKey(d),
        progress: { done: 0, total: 0 },
        tasks: [],
        events: [],
      });
    }
    const isDone = (date: string, id: string) => done.get(date)?.has(id) ?? false;

    for (const task of tasks) {
      for (const date of expandTask(task, from, to)) {
        days.get(date)?.tasks.push({
          sourceType: 'task',
          sourceId: task.id,
          calendarId: String(task.calendarId),
          color: colorOf.get(String(task.calendarId))!,
          title: task.title,
          description: task.description ?? '',
          recurring: !/COUNT=1(;|$)/.test(task.rrule),
          position: task.position ?? 0,
          done: isDone(date, task.id),
        });
      }
    }

    for (const event of events) {
      for (const occ of expandEvent(event, from, to)) {
        // Un evento de varios días aparece en cada día que abarca (dentro del rango)
        const lastMoment = new Date(occ.end.getTime() - 1);
        for (let d = parseDate(toDateKey(occ.start)); d <= lastMoment; d = addDays(d, 1)) {
          days.get(toDateKey(d))?.events.push({
            sourceType: 'event',
            sourceId: event.id,
            calendarId: String(event.calendarId),
            color: colorOf.get(String(event.calendarId))!,
            title: event.title,
            notes: event.notes,
            start: toDateTimeString(occ.start),
            end: toDateTimeString(occ.end),
            recurring: !!event.rrule,
            allDay: !!event.allDay,
            // Los eventos no se tachan: solo las tareas
            checkable: false,
            done: false,
          });
        }
      }
    }

    for (const day of days.values()) {
      day.tasks.sort((a, b) => a.position - b.position || a.title.localeCompare(b.title, 'es'));
      // Primero los de día completo, luego por hora
      day.events.sort(
        (a, b) =>
          Number(b.allDay) - Number(a.allDay) ||
          a.start.localeCompare(b.start) ||
          a.end.localeCompare(b.end),
      );
      // El avance del día cuenta solo tareas
      day.progress = { done: day.tasks.filter((t) => t.done).length, total: day.tasks.length };
    }

    return { from: fromKey, to: toKey, days: [...days.values()] };
  }

  /** Todo lo de un día: alimenta el modal del día */
  async day(userId: string, date: string, calendarIds?: string[]) {
    const { days } = await this.range(userId, date, date, calendarIds);
    return days[0];
  }

  private parseRange(fromKey: string, toKey: string) {
    let from: Date;
    let last: Date;
    try {
      from = parseDate(fromKey);
      last = parseDate(toKey);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    const to = addDays(last, 1);
    const span = (to.getTime() - from.getTime()) / 86_400_000;
    if (span < 1) throw new BadRequestException('"to" debe ser igual o posterior a "from"');
    if (span > MAX_RANGE_DAYS)
      throw new BadRequestException(`El rango máximo es de ${MAX_RANGE_DAYS} días`);
    return { from, to };
  }
}
