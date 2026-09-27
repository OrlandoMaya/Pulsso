import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CalendarsModule } from '../calendars/calendars.module';
import { Completion, CompletionSchema } from '../completions/schemas/completion.schema';
import { CalendarEvent, EventSchema } from '../events/schemas/event.schema';
import { Task, TaskSchema } from '../tasks/schemas/task.schema';
import { GeneralTasksController } from './general-tasks.controller';
import { GeneralTasksService } from './general-tasks.service';
import { GeneralTask, GeneralTaskSchema } from './schemas/general-task.schema';

@Module({
  imports: [
    CalendarsModule,
    MongooseModule.forFeature([
      { name: GeneralTask.name, schema: GeneralTaskSchema },
      { name: Task.name, schema: TaskSchema },
      { name: CalendarEvent.name, schema: EventSchema },
      { name: Completion.name, schema: CompletionSchema },
    ]),
  ],
  controllers: [GeneralTasksController],
  providers: [GeneralTasksService],
  exports: [GeneralTasksService],
})
export class GeneralTasksModule {}
