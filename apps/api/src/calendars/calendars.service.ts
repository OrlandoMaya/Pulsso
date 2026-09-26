import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Completion } from '../completions/schemas/completion.schema';
import { CalendarEvent } from '../events/schemas/event.schema';
import { Task } from '../tasks/schemas/task.schema';
import { CreateCalendarDto, UpdateCalendarDto } from './dto/calendar.dto';
import { Calendar, CalendarColor } from './schemas/calendar.schema';

const DEFAULT_CALENDARS: { name: string; color: CalendarColor }[] = [
  { name: 'Trabajo', color: 'blue' },
  { name: 'Equipo', color: 'violet' },
  { name: 'Clientes', color: 'amber' },
  { name: 'Personal', color: 'emerald' },
  { name: 'Otros', color: 'rose' },
];

@Injectable()
export class CalendarsService {
  constructor(
    @InjectModel(Calendar.name) private readonly calendars: Model<Calendar>,
    @InjectModel(CalendarEvent.name) private readonly events: Model<CalendarEvent>,
    @InjectModel(Task.name) private readonly tasks: Model<Task>,
    @InjectModel(Completion.name) private readonly completions: Model<Completion>,
  ) {}

  async createDefaults(userId: string) {
    await this.calendars.insertMany(
      DEFAULT_CALENDARS.map((c) => ({ ...c, userId: new Types.ObjectId(userId) })),
    );
  }

  findAll(userId: string) {
    return this.calendars.find({ userId }).sort({ createdAt: 1 }).exec();
  }

  async findOne(userId: string, id: string) {
    const calendar = await this.calendars.findOne({ _id: id, userId }).exec();
    if (!calendar) throw new NotFoundException('Calendario no encontrado');
    return calendar;
  }

  create(userId: string, dto: CreateCalendarDto) {
    return this.calendars.create({ ...dto, userId: new Types.ObjectId(userId) });
  }

  async update(userId: string, id: string, dto: UpdateCalendarDto) {
    const calendar = await this.calendars
      .findOneAndUpdate({ _id: id, userId }, dto, { new: true, runValidators: true })
      .exec();
    if (!calendar) throw new NotFoundException('Calendario no encontrado');
    return calendar;
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    const [eventIds, taskIds] = await Promise.all([
      this.events.find({ userId, calendarId: id }).distinct('_id'),
      this.tasks.find({ userId, calendarId: id }).distinct('_id'),
    ]);
    await Promise.all([
      this.completions.deleteMany({ userId, sourceId: { $in: [...eventIds, ...taskIds] } }),
      this.events.deleteMany({ userId, calendarId: id }),
      this.tasks.deleteMany({ userId, calendarId: id }),
    ]);
    await this.calendars.deleteOne({ _id: id, userId });
  }
}
