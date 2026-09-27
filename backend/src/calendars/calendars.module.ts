import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Completion, CompletionSchema } from '../completions/schemas/completion.schema';
import { CalendarEvent, EventSchema } from '../events/schemas/event.schema';
import { GeneralTask, GeneralTaskSchema } from '../general-tasks/schemas/general-task.schema';
import { Task, TaskSchema } from '../tasks/schemas/task.schema';
import { CalendarsController } from './calendars.controller';
import { CalendarsService } from './calendars.service';
import { Calendar, CalendarSchema } from './schemas/calendar.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Calendar.name, schema: CalendarSchema },
      { name: CalendarEvent.name, schema: EventSchema },
      { name: Task.name, schema: TaskSchema },
      { name: Completion.name, schema: CompletionSchema },
      { name: GeneralTask.name, schema: GeneralTaskSchema },
    ]),
  ],
  controllers: [CalendarsController],
  providers: [CalendarsService],
  exports: [CalendarsService],
})
export class CalendarsModule {}
