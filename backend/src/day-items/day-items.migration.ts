import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Calendar } from '../calendars/schemas/calendar.schema';
import { Completion } from '../completions/schemas/completion.schema';
import { Task } from '../tasks/schemas/task.schema';
import { DayItem } from './schemas/day-item.schema';

const ONE_OFF_RRULE = 'FREQ=DAILY;COUNT=1';

/**
 * Los "objetivos del día" (colección day_items) ahora son tareas normales.
 * Al arrancar, convierte los que queden en tareas (misma fecha, título y descripción;
 * lista Trabajo/Personal → categoría con ese nombre) y los borra. Es idempotente.
 */
@Injectable()
export class DayItemsMigration implements OnApplicationBootstrap {
  private readonly logger = new Logger('DayItemsMigration');

  constructor(
    @InjectModel(DayItem.name) private readonly dayItems: Model<DayItem>,
    @InjectModel(Task.name) private readonly tasks: Model<Task>,
    @InjectModel(Calendar.name) private readonly calendars: Model<Calendar>,
    @InjectModel(Completion.name) private readonly completions: Model<Completion>,
  ) {}

  onApplicationBootstrap() {
    // No bloquea el arranque; si falla se reintenta en el próximo inicio
    void this.run().catch((e: Error) => this.logger.warn(`No se pudo migrar: ${e.message}`));
  }

  async run() {
    const items = await this.dayItems.find().sort({ date: 1, list: 1, position: 1 }).lean().exec();
    if (!items.length) return 0;

    const byUser = new Map<string, typeof items>();
    for (const item of items) {
      const key = String(item.userId);
      byUser.set(key, [...(byUser.get(key) ?? []), item]);
    }

    let migrated = 0;
    for (const [userId, list] of byUser) {
      const cals = await this.calendars.find({ userId }).sort({ createdAt: 1 }).lean().exec();
      if (!cals.length) continue;
      const pick = (re: RegExp) => (cals.find((c) => re.test(c.name)) ?? cals[0])._id;
      const calendarFor = { work: pick(/trabajo/i), personal: pick(/personal/i) };
      const last = await this.tasks.findOne({ userId }).sort({ position: -1 }).lean().exec();
      let position = (last?.position ?? -1) + 1;

      for (const item of list) {
        const task = await this.tasks.create({
          userId: new Types.ObjectId(userId),
          calendarId: calendarFor[item.list],
          title: item.title,
          description: item.description ?? '',
          startDate: item.date,
          rrule: ONE_OFF_RRULE,
          position: position++,
        });
        if (item.done) {
          await this.completions.updateOne(
            { userId: task.userId, sourceId: task._id, date: item.date },
            {
              $setOnInsert: {
                userId: task.userId,
                sourceId: task._id,
                date: item.date,
                sourceType: 'task',
              },
            },
            { upsert: true },
          );
        }
        await this.dayItems.deleteOne({ _id: item._id });
        migrated++;
      }
    }
    this.logger.log(`${migrated} objetivos del día convertidos en tareas`);
    return migrated;
  }
}
