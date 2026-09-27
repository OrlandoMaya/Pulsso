import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventsService } from '../events/events.service';
import { taskOccursOn } from '../recurrence/recurrence';
import { TasksService } from '../tasks/tasks.service';
import { SetCompletionDto } from './dto/completion.dto';
import { Completion } from './schemas/completion.schema';

@Injectable()
export class CompletionsService {
  constructor(
    @InjectModel(Completion.name) private readonly completions: Model<Completion>,
    private readonly events: EventsService,
    private readonly tasks: TasksService,
  ) {}

  async set(userId: string, dto: SetCompletionDto) {
    await this.assertCheckable(userId, dto);
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
      return;
    }
    // Existe y es de esta persona (404 si no), pero los eventos no se tachan
    await this.events.findOne(userId, dto.sourceId);
    throw new BadRequestException('Los eventos no se tachan; crea una tarea para eso');
  }
}
