import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Calendar, CalendarSchema } from '../calendars/schemas/calendar.schema';
import { Completion, CompletionSchema } from '../completions/schemas/completion.schema';
import { Task, TaskSchema } from '../tasks/schemas/task.schema';
import { DayItemsMigration } from './day-items.migration';
import { DayItem, DayItemSchema } from './schemas/day-item.schema';

/** Solo migra los antiguos objetivos del día a tareas (ya no expone endpoints) */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DayItem.name, schema: DayItemSchema },
      { name: Task.name, schema: TaskSchema },
      { name: Calendar.name, schema: CalendarSchema },
      { name: Completion.name, schema: CompletionSchema },
    ]),
  ],
  providers: [DayItemsMigration],
})
export class DayItemsModule {}
