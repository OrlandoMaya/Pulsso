import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

/** Subtareas tachadas de una tarea en un día (en las recurrentes se tachan por día) */
@Schema({ collection: 'subtask_completions', timestamps: true })
export class SubtaskCompletion {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  taskId: Types.ObjectId;

  /** Día de la ocurrencia (YYYY-MM-DD) */
  @Prop({ required: true })
  date: string;

  /** Ids de las subtareas tachadas */
  @Prop({ type: [String], default: [] })
  subtaskIds: string[];
}

export type SubtaskCompletionDocument = HydratedDocument<SubtaskCompletion>;
export const SubtaskCompletionSchema = SchemaFactory.createForClass(SubtaskCompletion);
SubtaskCompletionSchema.index({ userId: 1, taskId: 1, date: 1 }, { unique: true });
SubtaskCompletionSchema.index({ userId: 1, date: 1 });
