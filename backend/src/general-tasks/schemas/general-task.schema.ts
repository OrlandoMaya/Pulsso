import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { toJSONOptions } from '../../common/utils/serialize';

export const NODE_TYPES = ['start', 'activity', 'decision', 'end'] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export const NODE_STATUSES = ['pending', 'in_progress', 'done'] as const;
export type NodeStatus = (typeof NODE_STATUSES)[number];

/** Elemento del diagrama de actividades de un proyecto */
@Schema({ _id: false })
export class ProjectNode {
  /** Id que genera el cliente (estable entre guardados) */
  @Prop({ required: true })
  id: string;

  @Prop({ required: true, enum: NODE_TYPES })
  type: NodeType;

  @Prop({ trim: true, maxlength: 120, default: '' })
  title: string;

  @Prop({ trim: true, maxlength: 2000, default: '' })
  notes: string;

  @Prop({ required: true })
  x: number;

  @Prop({ required: true })
  y: number;

  @Prop({ enum: NODE_STATUSES, default: 'pending' })
  status: NodeStatus;
}
const ProjectNodeSchema = SchemaFactory.createForClass(ProjectNode);

/** Flecha entre dos elementos (con etiqueta opcional, p. ej. "Sí" / "No" tras una decisión) */
@Schema({ _id: false })
export class ProjectEdge {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  source: string;

  @Prop({ required: true })
  target: string;

  @Prop({ type: String, default: null })
  sourceHandle: string | null;

  @Prop({ type: String, default: null })
  targetHandle: string | null;

  @Prop({ trim: true, maxlength: 40, default: '' })
  label: string;
}
const ProjectEdgeSchema = SchemaFactory.createForClass(ProjectEdge);

/**
 * Tarea general: algo por hacer sin día fijo. Si es un proyecto, tiene un diagrama de
 * actividades cuyos elementos se pueden programar en el calendario como tarea o evento.
 */
@Schema({
  collection: 'general_tasks',
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
export class GeneralTask {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  calendarId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 120 })
  title: string;

  @Prop({ trim: true, maxlength: 5000, default: '' })
  description: string;

  @Prop({ default: false })
  done: boolean;

  @Prop({ default: false })
  isProject: boolean;

  @Prop({ default: 0 })
  position: number;

  @Prop({ type: [ProjectNodeSchema], default: [] })
  nodes: ProjectNode[];

  @Prop({ type: [ProjectEdgeSchema], default: [] })
  edges: ProjectEdge[];
}

export type GeneralTaskDocument = HydratedDocument<GeneralTask>;
export const GeneralTaskSchema = SchemaFactory.createForClass(GeneralTask);
