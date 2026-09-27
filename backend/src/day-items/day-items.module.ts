import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DayItemsController } from './day-items.controller';
import { DayItemsService } from './day-items.service';
import { DayItem, DayItemSchema } from './schemas/day-item.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: DayItem.name, schema: DayItemSchema }])],
  controllers: [DayItemsController],
  providers: [DayItemsService],
  exports: [DayItemsService],
})
export class DayItemsModule {}
