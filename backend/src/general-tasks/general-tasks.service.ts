import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CalendarsService } from '../calendars/calendars.service';
import { toDateKey, toDateTimeString } from '../common/utils/date';
import { Completion } from '../completions/schemas/completion.schema';
import { CalendarEvent } from '../events/schemas/event.schema';
import { Task } from '../tasks/schemas/task.schema';
import { CreateGeneralTaskDto, DiagramDto, UpdateGeneralTaskDto } from './dto/general-task.dto';
import {
  GeneralTask,
  GeneralTaskDocument,
  NodeStatus,
  ProjectNode,
} from './schemas/general-task.schema';

const ONE_OFF = /COUNT=1(;|$)/;

/** Lo que el calendario tiene de un elemento del diagrama */
export interface ScheduledLink {
  kind: 'task' | 'event';
  id: string;
  /** Primer día (YYYY-MM-DD) */
  date: string;
  start?: string;
  end?: string;
  allDay?: boolean;
  /** Tarea de un solo día: se tacha una vez */
  oneOff: boolean;
  done: boolean;
}

/**
 * Estado que se ve de un elemento. Si está programado como tarea de un día, "hecho" es
 * haberla tachado en el calendario (en cualquiera de los dos lados).
 */
export function effectiveStatus(stored: NodeStatus, link?: ScheduledLink): NodeStatus {
  if (link?.kind !== 'task' || !link.oneOff) return stored;
  if (link.done) return 'done';
  return stored === 'done' ? 'pending' : stored;
}

/** Diagrama inicial de un proyecto nuevo: Inicio → Primera actividad → Fin */
function starterDiagram(): Pick<GeneralTask, 'nodes' | 'edges'> {
  const node = (id: string, type: ProjectNode['type'], title: string, y: number, x = 0) =>
    ({ id, type, title, notes: '', x, y, status: 'pending' }) as ProjectNode;
  return {
    nodes: [
      node('inicio', 'start', 'Inicio', 0, 96),
      node('a1', 'activity', 'Primera actividad', 110),
      node('fin', 'end', 'Fin', 260, 96),
    ],
    edges: [
      {
        id: 'e-inicio-a1',
        source: 'inicio',
        target: 'a1',
        sourceHandle: null,
        targetHandle: null,
        label: '',
      },
      {
        id: 'e-a1-fin',
        source: 'a1',
        target: 'fin',
        sourceHandle: null,
        targetHandle: null,
        label: '',
      },
    ],
  };
}

@Injectable()
export class GeneralTasksService {
  constructor(
    @InjectModel(GeneralTask.name) private readonly items: Model<GeneralTask>,
    @InjectModel(Task.name) private readonly tasks: Model<Task>,
    @InjectModel(CalendarEvent.name) private readonly events: Model<CalendarEvent>,
    @InjectModel(Completion.name) private readonly completions: Model<Completion>,
    private readonly calendars: CalendarsService,
  ) {}

  /** Lista sin el diagrama, con el avance de cada proyecto */
  async findAll(userId: string) {
    const docs = await this.items.find({ userId }).sort({ position: 1, createdAt: 1 }).exec();
    const links = await this.linksOf(
      userId,
      docs.filter((d) => d.isProject).map((d) => d._id),
    );
    return docs.map((doc) => {
      const { nodes, edges, ...rest } = doc.toJSON() as Record<string, any>;
      void edges;
      if (!doc.isProject) return rest;
      const activities = (nodes as ProjectNode[])
        .filter((n) => n.type === 'activity')
        .map((n) => effectiveStatus(n.status, links.get(`${doc.id}:${n.id}`)));
      return {
        ...rest,
        progress: {
          done: activities.filter((s) => s === 'done').length,
          inProgress: activities.filter((s) => s === 'in_progress').length,
          total: activities.length,
        },
      };
    });
  }

  async findDoc(userId: string, id: string): Promise<GeneralTaskDocument> {
    const doc = await this.items.findOne({ _id: id, userId }).exec();
    if (!doc) throw new NotFoundException('Tarea general no encontrada');
    return doc;
  }

  /** Con el diagrama y lo que cada elemento tiene en el calendario */
  async findOne(userId: string, id: string) {
    return this.present(userId, await this.findDoc(userId, id));
  }

  async create(userId: string, dto: CreateGeneralTaskDto) {
    await this.calendars.findOne(userId, dto.calendarId);
    const first = await this.items.findOne({ userId }).sort({ position: 1 }).lean().exec();
    const doc = await this.items.create({
      ...dto,
      description: dto.description ?? '',
      isProject: dto.isProject ?? false,
      // Lo nuevo va arriba
      position: first ? (first.position ?? 0) - 1 : 0,
      userId: new Types.ObjectId(userId),
      calendarId: new Types.ObjectId(dto.calendarId),
      ...(dto.isProject && starterDiagram()),
    });
    return this.present(userId, doc);
  }

  async update(userId: string, id: string, dto: UpdateGeneralTaskDto) {
    const doc = await this.findDoc(userId, id);
    if (dto.calendarId) {
      await this.calendars.findOne(userId, dto.calendarId);
      doc.calendarId = new Types.ObjectId(dto.calendarId);
    }
    doc.set({
      title: dto.title ?? doc.title,
      description: dto.description ?? doc.description,
      done: dto.done ?? doc.done,
    });
    return this.present(userId, await doc.save());
  }

  /** Borra la tarea general; lo que ya estaba en el calendario se queda, sin vínculo */
  async remove(userId: string, id: string) {
    await this.findDoc(userId, id);
    await this.unlink(userId, { projectId: new Types.ObjectId(id) });
    await this.items.deleteOne({ _id: id, userId });
  }

  async reorder(userId: string, ids: string[]) {
    const owned = await this.items.countDocuments({ userId, _id: { $in: ids } });
    if (owned !== new Set(ids).size) throw new NotFoundException('Tarea general no encontrada');
    await this.items.bulkWrite(
      ids.map((id, position) => ({
        updateOne: {
          filter: { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
          update: { $set: { position } },
        },
      })),
    );
    return { ok: true };
  }

  /** Guarda el diagrama completo (elementos y flechas) */
  async saveDiagram(userId: string, id: string, dto: DiagramDto) {
    const doc = await this.findDoc(userId, id);
    if (!doc.isProject) throw new BadRequestException('Solo los proyectos tienen diagrama');

    const ids = new Set<string>();
    for (const n of dto.nodes) {
      if (ids.has(n.id)) throw new BadRequestException(`Elemento repetido: ${n.id}`);
      ids.add(n.id);
    }
    const edgeIds = new Set<string>();
    for (const e of dto.edges) {
      if (edgeIds.has(e.id)) throw new BadRequestException(`Flecha repetida: ${e.id}`);
      edgeIds.add(e.id);
      if (!ids.has(e.source) || !ids.has(e.target) || e.source === e.target) {
        throw new BadRequestException(`La flecha ${e.id} une elementos que no existen`);
      }
    }

    // Lo programado de elementos borrados sigue en el calendario, sin vínculo
    await this.unlink(userId, { projectId: doc._id, nodeId: { $nin: [...ids] } });

    doc.set({
      nodes: dto.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title ?? '',
        notes: n.notes ?? '',
        x: n.x,
        y: n.y,
        status: n.status ?? 'pending',
      })),
      edges: dto.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? null,
        targetHandle: e.targetHandle ?? null,
        label: e.label ?? '',
      })),
    });
    return this.present(userId, await doc.save());
  }

  /**
   * Antes de programar un elemento: comprueba que exista y suelta lo que tuviera antes
   * (cada elemento vive en el calendario una sola vez).
   */
  async prepareLink(userId: string, projectId: string, nodeId: string) {
    const doc = await this.items.findOne({ _id: projectId, userId, isProject: true }).exec();
    if (!doc) throw new NotFoundException('Proyecto no encontrado');
    if (!doc.nodes.some((n) => n.id === nodeId && n.type === 'activity')) {
      throw new BadRequestException('Solo las actividades del diagrama se pueden programar');
    }
    await this.unlink(userId, { projectId: doc._id, nodeId });
    return { projectId: doc._id, nodeId };
  }

  /** Nombres de proyectos (para mostrar "Proyecto: …" en el calendario) */
  async titles(userId: string, ids: string[]) {
    if (!ids.length) return new Map<string, string>();
    const docs = await this.items
      .find({ userId, _id: { $in: ids } }, { title: 1 })
      .lean()
      .exec();
    return new Map(docs.map((d) => [String(d._id), d.title]));
  }

  private async unlink(userId: string, filter: Record<string, unknown>) {
    const update = { $set: { projectId: null, nodeId: null } };
    await Promise.all([
      this.tasks.updateMany({ userId, ...filter }, update),
      this.events.updateMany({ userId, ...filter }, update),
    ]);
  }

  /** Enlaces "proyecto:elemento" → lo programado en el calendario */
  private async linksOf(userId: string, projectIds: Types.ObjectId[]) {
    const links = new Map<string, ScheduledLink>();
    if (!projectIds.length) return links;
    const filter = { userId, projectId: { $in: projectIds }, nodeId: { $ne: null } };
    const [tasks, events] = await Promise.all([
      this.tasks.find(filter).sort({ createdAt: 1 }).lean().exec(),
      this.events.find(filter).sort({ createdAt: 1 }).lean().exec(),
    ]);
    const oneOff = tasks.filter((t) => ONE_OFF.test(t.rrule));
    const done = new Set(
      (
        await this.completions
          .find({ userId, sourceId: { $in: oneOff.map((t) => t._id) } }, { sourceId: 1, date: 1 })
          .lean()
          .exec()
      ).map((c) => `${String(c.sourceId)}:${c.date}`),
    );
    for (const t of tasks) {
      const isOneOff = ONE_OFF.test(t.rrule);
      links.set(`${String(t.projectId)}:${t.nodeId}`, {
        kind: 'task',
        id: String(t._id),
        date: t.startDate,
        oneOff: isOneOff,
        done: isOneOff && done.has(`${String(t._id)}:${t.startDate}`),
      });
    }
    for (const e of events) {
      links.set(`${String(e.projectId)}:${e.nodeId}`, {
        kind: 'event',
        id: String(e._id),
        date: toDateKey(e.start),
        start: toDateTimeString(e.start),
        end: toDateTimeString(e.end),
        allDay: e.allDay,
        oneOff: !e.rrule,
        done: false,
      });
    }
    return links;
  }

  private async present(userId: string, doc: GeneralTaskDocument) {
    const json = doc.toJSON() as Record<string, any>;
    if (!doc.isProject) {
      delete json.nodes;
      delete json.edges;
      return json;
    }
    const links = await this.linksOf(userId, [doc._id]);
    json.nodes = (json.nodes as ProjectNode[]).map((n) => {
      const scheduled = links.get(`${doc.id}:${n.id}`) ?? null;
      return { ...n, status: effectiveStatus(n.status, scheduled ?? undefined), scheduled };
    });
    const activities = (json.nodes as { type: string; status: NodeStatus }[]).filter(
      (n) => n.type === 'activity',
    );
    json.progress = {
      done: activities.filter((n) => n.status === 'done').length,
      inProgress: activities.filter((n) => n.status === 'in_progress').length,
      total: activities.length,
    };
    return json;
  }
}
