import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { addDays, parseDate, toDateKey } from '../common/utils/date';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';
import { ExpenseCategory } from './schemas/expense-category.schema';
import { Expense } from './schemas/expense.schema';

/** Rango máximo de una consulta (un año y poco) */
const MAX_RANGE_DAYS = 400;

const toCents = (amount: number) => Math.round(amount * 100);

export interface CategoryStat {
  /** null = gastos sin categoría */
  categoryId: string | null;
  name: string;
  color: string;
  total: number;
  count: number;
  /** Presupuesto mensual (null = sin presupuesto) */
  budget: number | null;
  /** Cuánto se pasó del presupuesto (0 si no se pasó o no tiene) */
  overBy: number;
}

@Injectable()
export class ExpensesService {
  constructor(
    @InjectModel(Expense.name) private readonly expenses: Model<Expense>,
    @InjectModel(ExpenseCategory.name) private readonly categories: Model<ExpenseCategory>,
  ) {}

  /** Gastos del rango, del más reciente al más antiguo */
  async list(userId: string, from: string, to: string) {
    this.checkRange(from, to);
    return this.expenses
      .find({ userId, date: { $gte: from, $lte: to } })
      .sort({ date: -1, createdAt: -1 })
      .exec();
  }

  async create(userId: string, dto: CreateExpenseDto) {
    this.checkDate(dto.date);
    const { amount, categoryId, ...rest } = dto;
    return this.expenses.create({
      ...rest,
      categoryId: await this.categoryRef(userId, categoryId),
      description: dto.description ?? '',
      amountCents: toCents(amount),
      userId: new Types.ObjectId(userId),
    });
  }

  async update(userId: string, id: string, dto: UpdateExpenseDto) {
    const expense = await this.findOne(userId, id);
    if (dto.date) this.checkDate(dto.date);
    if (dto.categoryId !== undefined)
      expense.categoryId = await this.categoryRef(userId, dto.categoryId);
    expense.set({
      date: dto.date ?? expense.date,
      title: dto.title ?? expense.title,
      description: dto.description ?? expense.description,
      amountCents: dto.amount !== undefined ? toCents(dto.amount) : expense.amountCents,
    });
    return expense.save();
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.expenses.deleteOne({ _id: id, userId });
  }

  /** Total gastado por día del rango (todos los días, con 0 si no hubo gastos) y el total histórico */
  async summary(userId: string, from: string, to: string) {
    this.checkRange(from, to);
    const uid = new Types.ObjectId(userId);
    const [byDay, allTime, byCategory, categories] = await Promise.all([
      this.expenses.aggregate<{ _id: string; cents: number; count: number }>([
        { $match: { userId: uid, date: { $gte: from, $lte: to } } },
        { $group: { _id: '$date', cents: { $sum: '$amountCents' }, count: { $sum: 1 } } },
      ]),
      this.expenses.aggregate<{ cents: number; count: number }>([
        { $match: { userId: uid } },
        { $group: { _id: null, cents: { $sum: '$amountCents' }, count: { $sum: 1 } } },
      ]),
      this.expenses.aggregate<{ _id: Types.ObjectId | null; cents: number; count: number }>([
        { $match: { userId: uid, date: { $gte: from, $lte: to } } },
        { $group: { _id: '$categoryId', cents: { $sum: '$amountCents' }, count: { $sum: 1 } } },
      ]),
      this.categories.find({ userId: uid }).sort({ createdAt: 1 }).lean().exec(),
    ]);
    const found = new Map(byDay.map((d) => [d._id, d]));
    const days: { date: string; total: number; count: number }[] = [];
    for (let d = parseDate(from); toDateKey(d) <= to; d = addDays(d, 1)) {
      const row = found.get(toDateKey(d));
      days.push({ date: toDateKey(d), total: (row?.cents ?? 0) / 100, count: row?.count ?? 0 });
    }
    const totalCents = byDay.reduce((n, d) => n + d.cents, 0);
    const top = byDay.reduce<(typeof byDay)[number] | null>(
      (m, d) => (!m || d.cents > m.cents ? d : m),
      null,
    );
    return {
      from,
      to,
      total: totalCents / 100,
      count: byDay.reduce((n, d) => n + d.count, 0),
      /** Promedio por día del rango (contando los días sin gastos) */
      dailyAverage: Math.round(totalCents / days.length) / 100,
      max: top ? { date: top._id, total: top.cents / 100 } : null,
      days,
      allTime: { total: (allTime[0]?.cents ?? 0) / 100, count: allTime[0]?.count ?? 0 },
      byCategory: this.categoryStats(byCategory, categories),
    };
  }

  /** Total gastado por día en [from, to] (para la agenda) */
  async spentByDate(userId: string, from: string, to: string) {
    const rows = await this.expenses.aggregate<{ _id: string; cents: number }>([
      { $match: { userId: new Types.ObjectId(userId), date: { $gte: from, $lte: to } } },
      { $group: { _id: '$date', cents: { $sum: '$amountCents' } } },
    ]);
    return new Map(rows.map((r) => [r._id, r.cents / 100]));
  }

  /**
   * Gastado por categoría (de más a menos) contra su presupuesto mensual. Incluye las categorías
   * sin gastos que tienen presupuesto, y "Sin categoría" si hay gastos sin clasificar.
   */
  private categoryStats(
    rows: { _id: Types.ObjectId | null; cents: number; count: number }[],
    categories: (ExpenseCategory & { _id: Types.ObjectId })[],
  ) {
    const spent = new Map(rows.map((r) => [r._id ? String(r._id) : null, r]));
    const stats: CategoryStat[] = categories
      .filter((c) => spent.has(String(c._id)) || c.budgetCents != null)
      .map((c) => {
        const row = spent.get(String(c._id));
        const cents = row?.cents ?? 0;
        const budget = c.budgetCents;
        return {
          categoryId: String(c._id),
          name: c.name,
          color: c.color as string,
          total: cents / 100,
          count: row?.count ?? 0,
          budget: budget == null ? null : budget / 100,
          overBy: budget != null && cents > budget ? (cents - budget) / 100 : 0,
        };
      });
    const loose = spent.get(null);
    if (loose) {
      stats.push({
        categoryId: null,
        name: 'Sin categoría',
        color: 'zinc',
        total: loose.cents / 100,
        count: loose.count,
        budget: null,
        overBy: 0,
      });
    }
    return stats.sort((a, b) => b.total - a.total);
  }

  private async categoryRef(userId: string, categoryId: string | null | undefined) {
    if (!categoryId) return null;
    const exists = await this.categories.exists({ _id: categoryId, userId });
    if (!exists) throw new NotFoundException('Categoría no encontrada');
    return new Types.ObjectId(categoryId);
  }

  private async findOne(userId: string, id: string) {
    const expense = await this.expenses.findOne({ _id: id, userId }).exec();
    if (!expense) throw new NotFoundException('Gasto no encontrado');
    return expense;
  }

  private checkRange(from: string, to: string) {
    this.checkDate(from);
    this.checkDate(to);
    if (to < from) throw new BadRequestException('"to" debe ser igual o posterior a "from"');
    const span = (parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000 + 1;
    if (span > MAX_RANGE_DAYS)
      throw new BadRequestException(`El rango máximo es de ${MAX_RANGE_DAYS} días`);
  }

  private checkDate(date: string) {
    try {
      parseDate(date);
    } catch {
      throw new BadRequestException(`Fecha inválida: ${date}`);
    }
  }
}
