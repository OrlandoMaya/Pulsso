import { Module } from '@nestjs/common';
import { CalendarsModule } from '../calendars/calendars.module';
import { CompletionsModule } from '../completions/completions.module';
import { EventsModule } from '../events/events.module';
import { GeneralTasksModule } from '../general-tasks/general-tasks.module';
import { TasksModule } from '../tasks/tasks.module';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';

@Module({
  imports: [CalendarsModule, EventsModule, TasksModule, CompletionsModule, GeneralTasksModule],
  controllers: [AgendaController],
  providers: [AgendaService],
})
export class AgendaModule {}
