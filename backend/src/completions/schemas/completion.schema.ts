import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { toJSONOptions } from '../../common/utils/serialize';

export const SOURCE_TYPES = ['event', 'task'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

/** Una ocurrencia tachada: (evento o tarea) + día */
@Schema({ timestamps: { createdAt: 'doneAt', updatedAt: false }, toJSON: toJSONOptions })
export class Completion {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: SOURCE_TYPES })
  sourceType: SourceType;

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  sourceId: Types.ObjectId;

  /** Día de la ocurrencia (YYYY-MM-DD) */
  @Prop({ required: true })
  date: string;
}

export type CompletionDocument = HydratedDocument<Completion>;
export const CompletionSchema = SchemaFactory.createForClass(Completion);
CompletionSchema.index({ userId: 1, sourceId: 1, date: 1 }, { unique: true });
CompletionSchema.index({ userId: 1, date: 1 });
