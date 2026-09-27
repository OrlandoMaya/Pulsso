import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GeneralTasksModule } from '../general-tasks/general-tasks.module';
import { CalendarsModule } from '../calendars/calendars.module';
import { Completion, CompletionSchema } from '../completions/schemas/completion.schema';
import { Task, TaskSchema } from './schemas/task.schema';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [
    CalendarsModule,
    GeneralTasksModule,
    MongooseModule.forFeature([
      { name: Task.name, schema: TaskSchema },
      { name: Completion.name, schema: CompletionSchema },
    ]),
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
