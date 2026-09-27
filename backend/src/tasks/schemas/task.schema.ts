import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { toJSONOptions } from '../../common/utils/serialize';

/**
 * Tarea: algo por hacer que se tacha. Normal = solo un día (RRULE con COUNT=1);
 * recurrente = se repite. Es la misma en la vista Día, la semana, el mes y el modal.
 */
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
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  calendarId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 120 })
  title: string;

  /** Notas, pasos o detalles (opcional) */
  @Prop({ trim: true, maxlength: 5000, default: '' })
  description: string;

  /** Orden en las listas (menor = arriba) */
  @Prop({ default: 0 })
  position: number;

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
