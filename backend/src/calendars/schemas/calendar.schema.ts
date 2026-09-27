import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { toJSONOptions } from '../../common/utils/serialize';

export const CALENDAR_COLORS = ['blue', 'violet', 'amber', 'emerald', 'rose', 'zinc'] as const;
export type CalendarColor = (typeof CALENDAR_COLORS)[number];

@Schema({ timestamps: true, toJSON: toJSONOptions })
export class Calendar {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 60 })
  name: string;

  @Prop({ required: true, enum: CALENDAR_COLORS })
  color: CalendarColor;

  @Prop({ default: true })
  visible: boolean;
}

export type CalendarDocument = HydratedDocument<Calendar>;
export const CalendarSchema = SchemaFactory.createForClass(Calendar);
