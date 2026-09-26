import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { toJSONOptions } from '../../common/utils/serialize';

/** Tarea recurrente sin hora (franja "Diario"); siempre se puede tachar */
@Schema({
  timestamps: true,
  toJSON: {
    ...toJSONOptions,
    transform: (doc: unknown, ret: Record<string, any>) => {
      toJSONOptions.transform(doc, ret);
      ret.calendarId = String(ret.calendarId);
      return ret;
    },
  },
})
export class Task {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  calendarId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 120 })
  title: string;

  /** Primer día (YYYY-MM-DD) desde el que se repite */
  @Prop({ required: true })
  startDate: string;

  /** RRULE sin DTSTART, p. ej. "FREQ=DAILY" o "FREQ=MONTHLY;BYMONTHDAY=1" */
  @Prop({ required: true })
  rrule: string;

  @Prop({ type: [String], default: [] })
  exdates: string[];
}

export type TaskDocument = HydratedDocument<Task>;
export const TaskSchema = SchemaFactory.createForClass(Task);
