import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { toJSONOptions } from '../../common/utils/serialize';

export const DAY_LISTS = ['personal', 'work'] as const;
export type DayList = (typeof DAY_LISTS)[number];

/** Tarea/objetivo de un día concreto, con descripción. No se repite. */
@Schema({ collection: 'day_items', timestamps: true, toJSON: toJSONOptions })
export class DayItem {
  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

  /** Día (YYYY-MM-DD) */
  @Prop({ required: true })
  date: string;

  /** Lista a la que pertenece: personal o trabajo */
  @Prop({ required: true, enum: DAY_LISTS })
  list: DayList;

  @Prop({ required: true, trim: true, maxlength: 200 })
  title: string;

  @Prop({ trim: true, maxlength: 5000, default: '' })
  description: string;

  @Prop({ default: false })
  done: boolean;

  /** Orden dentro de la lista (menor = arriba) */
  @Prop({ required: true, default: 0 })
  position: number;
}

export type DayItemDocument = HydratedDocument<DayItem>;
export const DayItemSchema = SchemaFactory.createForClass(DayItem);
DayItemSchema.index({ userId: 1, date: 1, list: 1, position: 1 });
