import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { parseDate } from '../common/utils/date';
import { CreateDayItemDto, UpdateDayItemDto } from './dto/day-item.dto';
import { DayItem, DayItemDocument, DayList } from './schemas/day-item.schema';

const MAX_PER_LIST = 500;

@Injectable()
export class DayItemsService {
  constructor(@InjectModel(DayItem.name) private readonly items: Model<DayItem>) {}

  list(userId: string, date: string, list: DayList) {
    this.checkDate(date);
    return this.items.find({ userId, date, list }).sort({ position: 1, createdAt: 1 }).exec();
  }

  async create(userId: string, dto: CreateDayItemDto) {
    this.checkDate(dto.date);
    const position = await this.nextPosition(userId, dto.date, dto.list);
    return this.items.create({
      ...dto,
      description: dto.description ?? '',
      userId: new Types.ObjectId(userId),
      position,
    });
  }

  async update(userId: string, id: string, dto: UpdateDayItemDto) {
    const item = await this.findOne(userId, id);
    const moving =
      (dto.date !== undefined && dto.date !== item.date) ||
      (dto.list !== undefined && dto.list !== item.list);
    if (dto.date) this.checkDate(dto.date);
    if (moving) {
      item.position = await this.nextPosition(userId, dto.date ?? item.date, dto.list ?? item.list);
    }
    item.set({
      title: dto.title ?? item.title,
      description: dto.description ?? item.description,
      done: dto.done ?? item.done,
      date: dto.date ?? item.date,
      list: dto.list ?? item.list,
    });
    return item.save();
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.items.deleteOne({ _id: id, userId });
  }

  async reorder(userId: string, date: string, list: DayList, ids: string[]) {
    const current = await this.items.find({ userId, date, list }, { _id: 1 }).lean().exec();
    const known = new Set(current.map((c) => String(c._id)));
    if (
      ids.length !== known.size ||
      new Set(ids).size !== ids.length ||
      !ids.every((i) => known.has(i))
    ) {
      throw new BadRequestException('La lista cambió; recarga e intenta de nuevo');
    }
    await this.items.bulkWrite(
      ids.map((id, position) => ({
        updateOne: {
          filter: { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
          update: { $set: { position } },
        },
      })),
    );
    return this.list(userId, date, list);
  }

  /** Mueve las pendientes de un día a otro (al final de la lista destino) */
  async carryOver(userId: string, from: string, to: string, list: DayList) {
    this.checkDate(from);
    this.checkDate(to);
    if (from === to) throw new BadRequestException('Elige un día distinto');
    const pending = await this.items
      .find({ userId, date: from, list, done: false })
      .sort({ position: 1 })
      .exec();
    let position = await this.nextPosition(userId, to, list);
    for (const item of pending) {
      item.set({ date: to, position: position++ });
      await item.save();
    }
    return { moved: pending.length };
  }

  private async findOne(userId: string, id: string): Promise<DayItemDocument> {
    const item = await this.items.findOne({ _id: id, userId }).exec();
    if (!item) throw new NotFoundException('Tarea no encontrada');
    return item;
  }

  private async nextPosition(userId: string, date: string, list: DayList) {
    const count = await this.items.countDocuments({ userId, date, list });
    if (count >= MAX_PER_LIST)
      throw new BadRequestException(`Máximo ${MAX_PER_LIST} tareas por lista`);
    const last = await this.items
      .findOne({ userId, date, list })
      .sort({ position: -1 })
      .lean()
      .exec();
    return last ? last.position + 1 : 0;
  }

  private checkDate(date: string) {
    try {
      parseDate(date);
    } catch {
      throw new BadRequestException(`Fecha inválida: ${date}`);
    }
  }
}
