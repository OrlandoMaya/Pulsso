import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { toDateTimeString } from '../../common/utils/date';
import { toJSONOptions } from '../../common/utils/serialize';

@Schema({
  collection: 'events',
  timestamps: true,
  toJSON: {
    ...toJSONOptions,
    transform: (doc: unknown, ret: Record<string, any>) => {
      toJSONOptions.transform(doc, ret);
      ret.calendarId = String(ret.calendarId);
      ret.projectId = ret.projectId ? String(ret.projectId) : null;
      ret.start = toDateTimeString(ret.start);
      ret.end = toDateTimeString(ret.end);
      return ret;
    },
  },
})
export class CalendarEvent {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  calendarId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 120 })
  title: string;

  @Prop({ trim: true, maxlength: 2000 })
  notes?: string;

  /** Hora de pared guardada como UTC (ver common/utils/date.ts) */
  @Prop({ required: true })
  start: Date;

  @Prop({ required: true })
  end: Date;

  /** RRULE sin DTSTART, p. ej. "FREQ=WEEKLY;BYDAY=MO,WE,FR". Vacío = evento único */
  @Prop({ type: String, default: null })
  rrule: string | null;

  /** Ocurrencias eliminadas (YYYY-MM-DD) */
  @Prop({ type: [String], default: [] })
  exdates: string[];

  /** Evento especial de día completo (cumpleaños, feriado…): sin horas */
  @Prop({ default: false })
  allDay: boolean;

  /** Si viene de un proyecto: el proyecto (tarea general) y el elemento del diagrama */
  @Prop({ type: SchemaTypes.ObjectId, default: null, index: { sparse: true } })
  projectId: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  nodeId: string | null;

  /** Si se puede tachar (por defecto, los recurrentes) */
  @Prop({ default: false })
  checkable: boolean;
}

export type EventDocument = HydratedDocument<CalendarEvent>;
export const EventSchema = SchemaFactory.createForClass(CalendarEvent);
EventSchema.index({ userId: 1, start: 1 });
