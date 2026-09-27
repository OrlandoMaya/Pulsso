import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CalendarsModule } from '../calendars/calendars.module';
import { Completion, CompletionSchema } from '../completions/schemas/completion.schema';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { CalendarEvent, EventSchema } from './schemas/event.schema';

@Module({
  imports: [
    CalendarsModule,
    MongooseModule.forFeature([
      { name: CalendarEvent.name, schema: EventSchema },
      { name: Completion.name, schema: CompletionSchema },
    ]),
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
