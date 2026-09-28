import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventsService } from '../events/events.service';
import { taskOccursOn } from '../recurrence/recurrence';
import { TasksService } from '../tasks/tasks.service';
import { SetCompletionDto, SetSubtaskCompletionDto } from './dto/completion.dto';
import { Completion } from './schemas/completion.schema';
import { SubtaskCompletion } from './schemas/subtask-completion.schema';

@Injectable()
export class CompletionsService {
  constructor(
    @InjectModel(Completion.name) private readonly completions: Model<Completion>,
    @InjectModel(SubtaskCompletion.name) private readonly subtaskDone: Model<SubtaskCompletion>,
    private readonly events: EventsService,
    private readonly tasks: TasksService,
  ) {}

  async set(userId: string, dto: SetCompletionDto) {
    const task = await this.assertCheckable(userId, dto);
    // Tachar la tarea tacha sus subtareas (y destacharla las destacha)
    if (task?.subtasks.length) {
      await this.saveSubtasks(
        userId,
        dto.sourceId,
        dto.date,
        dto.done ? task.subtasks.map((s) => s.id) : [],
      );
    }
    const filter = {
      userId: new Types.ObjectId(userId),
      sourceId: new Types.ObjectId(dto.sourceId),
      date: dto.date,
    };

    if (dto.done) {
      await this.completions.updateOne(
        filter,
        { $setOnInsert: { ...filter, sourceType: dto.sourceType } },
        { upsert: true },
      );
    } else {
      await this.completions.deleteOne(filter);
    }
    return { sourceType: dto.sourceType, sourceId: dto.sourceId, date: dto.date, done: dto.done };
  }

  /** Tacha una subtarea; la tarea se tacha sola cuando están todas (y se destacha si falta una) */
  async setSubtask(userId: string, dto: SetSubtaskCompletionDto) {
    const task = await this.tasks.findOne(userId, dto.taskId);
    if (!taskOccursOn(task, dto.date)) throw new BadRequestException('La tarea no toca ese día');
    if (!task.subtasks.some((s) => s.id === dto.subtaskId)) {
      throw new BadRequestException('La subtarea no existe');
    }
    const filter = {
      userId: new Types.ObjectId(userId),
      taskId: new Types.ObjectId(dto.taskId),
      date: dto.date,
    };
    const row = await this.subtaskDone
      .findOneAndUpdate(
        filter,
        dto.done
          ? { $addToSet: { subtaskIds: dto.subtaskId } }
          : { $pull: { subtaskIds: dto.subtaskId } },
        { upsert: true, new: true },
      )
      .lean()
      .exec();
    const doneIds = task.subtasks.map((s) => s.id).filter((id) => row.subtaskIds.includes(id));
    const taskDone = doneIds.length === task.subtasks.length;

    const completion = { userId: filter.userId, sourceId: filter.taskId, date: dto.date };
    if (taskDone) {
      await this.completions.updateOne(
        completion,
        { $setOnInsert: { ...completion, sourceType: 'task' } },
        { upsert: true },
      );
    } else {
      await this.completions.deleteOne(completion);
    }
    return { taskId: dto.taskId, date: dto.date, subtasksDone: doneIds, done: taskDone };
  }

  /** Subtareas tachadas por tarea y día: Map<'taskId|YYYY-MM-DD', Set<subtaskId>> */
  async subtasksDoneByDate(userId: string, fromKey: string, toKeyExclusive: string) {
    const rows = await this.subtaskDone
      .find(
        { userId, date: { $gte: fromKey, $lt: toKeyExclusive } },
        { taskId: 1, date: 1, subtaskIds: 1 },
      )
      .lean()
      .exec();
    return new Map(rows.map((r) => [`${String(r.taskId)}|${r.date}`, new Set(r.subtaskIds)]));
  }

  private async saveSubtasks(userId: string, taskId: string, date: string, subtaskIds: string[]) {
    const filter = {
      userId: new Types.ObjectId(userId),
      taskId: new Types.ObjectId(taskId),
      date,
    };
    await this.subtaskDone.updateOne(filter, { $set: { subtaskIds } }, { upsert: true });
  }

  /** Ids tachados por día: Map<'YYYY-MM-DD', Set<sourceId>> */
  async doneByDate(userId: string, fromKey: string, toKeyExclusive: string) {
    const rows = await this.completions
      .find({ userId, date: { $gte: fromKey, $lt: toKeyExclusive } }, { sourceId: 1, date: 1 })
      .lean()
      .exec();
    const map = new Map<string, Set<string>>();
    for (const r of rows) {
      if (!map.has(r.date)) map.set(r.date, new Set());
      map.get(r.date)!.add(String(r.sourceId));
    }
    return map;
  }

  private async assertCheckable(userId: string, dto: SetCompletionDto) {
    if (dto.sourceType === 'task') {
      const task = await this.tasks.findOne(userId, dto.sourceId);
      if (!taskOccursOn(task, dto.date)) throw new BadRequestException('La tarea no toca ese día');
      return task;
    }
    // Existe y es de esta persona (404 si no), pero los eventos no se tachan
    await this.events.findOne(userId, dto.sourceId);
    throw new BadRequestException('Los eventos no se tachan; crea una tarea para eso');
  }
}
