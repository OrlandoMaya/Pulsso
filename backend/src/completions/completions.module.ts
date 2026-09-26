import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsModule } from '../events/events.module';
import { TasksModule } from '../tasks/tasks.module';
import { CompletionsController } from './completions.controller';
import { CompletionsService } from './completions.service';
import { Completion, CompletionSchema } from './schemas/completion.schema';

@Module({
  imports: [
    EventsModule,
    TasksModule,
    MongooseModule.forFeature([{ name: Completion.name, schema: CompletionSchema }]),
  ],
  controllers: [CompletionsController],
  providers: [CompletionsService],
  exports: [CompletionsService],
})
export class CompletionsModule {}
