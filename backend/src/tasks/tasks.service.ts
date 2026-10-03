import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CalendarsService } from '../calendars/calendars.service';
import { parseDate, toDateKey } from '../common/utils/date';
import { GeneralTasksService } from '../general-tasks/general-tasks.service';
import { Completion } from '../completions/schemas/completion.schema';
import { SubtaskCompletion } from '../completions/schemas/subtask-completion.schema';
import { taskOccursOn } from '../recurrence/recurrence';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { Task, TaskDocument } from './schemas/task.schema';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private readonly tasks: Model<Task>,
    @InjectModel(Completion.name) private readonly completions: Model<Completion>,
    @InjectModel(SubtaskCompletion.name) private readonly subtaskDone: Model<SubtaskCompletion>,
    private readonly calendars: CalendarsService,
    private readonly projects: GeneralTasksService,
  ) {}

  findAll(userId: string) {
    return this.tasks.find({ userId }).sort({ createdAt: 1 }).exec();
  }

  async findOne(userId: string, id: string): Promise<TaskDocument> {
    const task = await this.tasks.findOne({ _id: id, userId }).exec();
    if (!task) throw new NotFoundException('Tarea no encontrada');
    return task;
  }

  /** Tareas que pueden tocar antes de `to` */
  findCandidates(userId: string, to: Date, calendarIds: string[]) {
    return this.tasks
      .find({ userId, calendarId: { $in: calendarIds }, startDate: { $lt: toDateKey(to) } })
      .exec();
  }

  async create(userId: string, dto: CreateTaskDto) {
    await this.calendars.findOne(userId, dto.calendarId);
    this.checkDate(dto.startDate);
    const { projectId, nodeId, ...data } = dto;
    const link =
      projectId && nodeId ? await this.projects.prepareLink(userId, projectId, nodeId) : null;
    this.checkSubtasks(data.subtasks);
    return this.tasks.create({
      ...data,
      subtasks: data.subtasks ?? [],
      ...link,
      description: dto.description ?? '',
      position: await this.nextPosition(userId),
      userId: new Types.ObjectId(userId),
      calendarId: new Types.ObjectId(dto.calendarId),
    });
  }

  async update(userId: string, id: string, dto: UpdateTaskDto) {
    const task = await this.findOne(userId, id);
    if (dto.calendarId) {
      await this.calendars.findOne(userId, dto.calendarId);
      task.calendarId = new Types.ObjectId(dto.calendarId);
    }
    if (dto.startDate) this.checkDate(dto.startDate);
    if (dto.subtasks) {
      this.checkSubtasks(dto.subtasks);
      task.subtasks = dto.subtasks;
      // Las que se quitaron dejan de contar como tachadas
      const ids = dto.subtasks.map((s) => s.id);
      await this.subtaskDone.updateMany(
        { userId, taskId: task._id },
        { $pull: { subtaskIds: { $nin: ids } } },
      );
      // Los días en que la tarea ya estaba hecha, las nuevas cuentan como hechas (no se deshace el historial)
      const doneDates = await this.completions
        .find({ userId, sourceId: task._id })
        .distinct('date');
      if (doneDates.length && ids.length) {
        await this.subtaskDone.bulkWrite(
          doneDates.map((date) => ({
            updateOne: {
              filter: { userId: new Types.ObjectId(userId), taskId: task._id, date },
              update: { $addToSet: { subtaskIds: { $each: ids } } },
              upsert: true,
            },
          })),
        );
      }
    }
    task.set({
      title: dto.title ?? task.title,
      description: dto.description ?? task.description,
      startDate: dto.startDate ?? task.startDate,
      rrule: dto.rrule ?? task.rrule,
    });
    return task.save();
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await Promise.all([
      this.tasks.deleteOne({ _id: id, userId }),
      this.completions.deleteMany({ userId, sourceId: id }),
      this.subtaskDone.deleteMany({ userId, taskId: id }),
    ]);
  }

  /** Quita la tarea solo de un día */
  async addExdate(userId: string, id: string, date: string) {
    const task = await this.findOne(userId, id);
    if (!taskOccursOn(task, date)) throw new BadRequestException('La tarea no toca ese día');
    await this.tasks.updateOne({ _id: id, userId }, { $addToSet: { exdates: date } });
    await this.completions.deleteMany({ userId, sourceId: id, date });
    await this.subtaskDone.deleteMany({ userId, taskId: id, date });
    return this.findOne(userId, id);
  }

  /** Cambia el orden: los ids dados quedan en ese orden, arriba del resto */
  async reorder(userId: string, ids: string[]) {
    const owned = await this.tasks.countDocuments({ userId, _id: { $in: ids } });
    if (owned !== new Set(ids).size) throw new NotFoundException('Tarea no encontrada');
    await this.tasks.bulkWrite(
      ids.map((id, position) => ({
        updateOne: {
          filter: { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
          update: { $set: { position } },
        },
      })),
    );
    return { ok: true };
  }

  /** Pasa las tareas normales (de un solo día) no hechas de `from` a `to` */
  async carryOver(userId: string, from: string, to: string, calendarIds?: string[]) {
    this.checkDate(from);
    this.checkDate(to);
    if (from === to) throw new BadRequestException('Elige un día distinto');
    const candidates = await this.tasks
      .find({
        userId,
        startDate: from,
        rrule: /COUNT=1(;|$)/,
        ...(calendarIds?.length && { calendarId: { $in: calendarIds } }),
      })
      .exec();
    const done = new Set(
      (
        await this.completions
          .find(
            { userId, date: from, sourceId: { $in: candidates.map((t) => t._id) } },
            { sourceId: 1 },
          )
          .lean()
          .exec()
      ).map((c) => String(c.sourceId)),
    );
    const pending = candidates.filter((t) => !done.has(t.id));
    await this.tasks.updateMany(
      { _id: { $in: pending.map((t) => t._id) }, userId },
      { $set: { startDate: to } },
    );
    return { moved: pending.length };
  }

  private async nextPosition(userId: string) {
    const last = await this.tasks.findOne({ userId }).sort({ position: -1 }).lean().exec();
    return last ? (last.position ?? 0) + 1 : 0;
  }

  private checkSubtasks(subtasks?: { id: string }[]) {
    const ids = subtasks?.map((s) => s.id) ?? [];
    if (new Set(ids).size !== ids.length)
      throw new BadRequestException('Subtareas con id repetido');
  }

  private checkDate(date: string) {
    try {
      parseDate(date);
    } catch {
      throw new BadRequestException(`Fecha inválida: ${date}`);
    }
  }
}
