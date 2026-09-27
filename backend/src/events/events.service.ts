import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CalendarsService } from '../calendars/calendars.service';
import { parseDateTime, toDateTimeString as toLocal } from '../common/utils/date';
import { Completion } from '../completions/schemas/completion.schema';
import { eventOccursOn } from '../recurrence/recurrence';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';
import { CalendarEvent, EventDocument } from './schemas/event.schema';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(CalendarEvent.name) private readonly events: Model<CalendarEvent>,
    @InjectModel(Completion.name) private readonly completions: Model<Completion>,
    private readonly calendars: CalendarsService,
  ) {}

  async findOne(userId: string, id: string): Promise<EventDocument> {
    const event = await this.events.findOne({ _id: id, userId }).exec();
    if (!event) throw new NotFoundException('Evento no encontrado');
    return event;
  }

  /** Eventos que pueden tener ocurrencias en [from, to) */
  findCandidates(userId: string, from: Date, to: Date, calendarIds: string[]) {
    return this.events
      .find({
        userId,
        calendarId: { $in: calendarIds },
        start: { $lt: to },
        $or: [{ rrule: { $nin: [null, ''] } }, { end: { $gt: from } }],
      })
      .exec();
  }

  async create(userId: string, dto: CreateEventDto) {
    await this.calendars.findOne(userId, dto.calendarId);
    const allDay = dto.allDay ?? false;
    const { start, end } = this.parseRange(dto.start, dto.end, allDay);
    return this.events.create({
      ...dto,
      userId: new Types.ObjectId(userId),
      calendarId: new Types.ObjectId(dto.calendarId),
      start,
      end,
      allDay,
      rrule: dto.rrule || null,
      // Los días especiales no se tachan
      checkable: allDay ? false : (dto.checkable ?? !!dto.rrule),
    });
  }

  async update(userId: string, id: string, dto: UpdateEventDto) {
    const event = await this.findOne(userId, id);
    if (dto.calendarId) {
      await this.calendars.findOne(userId, dto.calendarId);
      event.calendarId = new Types.ObjectId(dto.calendarId);
    }
    const allDay = dto.allDay ?? event.allDay ?? false;
    const { start, end } = this.parseRange(
      dto.start ?? toLocal(event.start),
      dto.end ?? toLocal(event.end),
      allDay,
    );
    event.set({
      title: dto.title ?? event.title,
      notes: dto.notes ?? event.notes,
      start,
      end,
      allDay,
      rrule: dto.rrule === undefined ? event.rrule : dto.rrule || null,
      checkable: allDay ? false : (dto.checkable ?? event.checkable),
    });
    return event.save();
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await Promise.all([
      this.events.deleteOne({ _id: id, userId }),
      this.completions.deleteMany({ userId, sourceId: id }),
    ]);
  }

  /** Borra solo una ocurrencia de un evento recurrente */
  async addExdate(userId: string, id: string, date: string) {
    const event = await this.findOne(userId, id);
    if (!event.rrule) throw new BadRequestException('El evento no es recurrente');
    if (!eventOccursOn(event, date)) throw new BadRequestException('El evento no ocurre ese día');
    await this.events.updateOne({ _id: id, userId }, { $addToSet: { exdates: date } });
    await this.completions.deleteMany({ userId, sourceId: id, date });
    return this.findOne(userId, id);
  }

  private parseRange(startStr: string, endStr: string, allDay = false) {
    if (allDay) {
      // Día completo: de las 00:00 de ese día a las 00:00 del siguiente
      const start = parseDateTime(`${startStr.slice(0, 10)}T00:00`);
      return { start, end: new Date(start.getTime() + 86_400_000) };
    }
    const start = parseDateTime(startStr);
    const end = parseDateTime(endStr);
    if (end <= start) throw new BadRequestException('La hora de fin debe ser posterior al inicio');
    return { start, end };
  }
}
