import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateExpenseCategoryDto, UpdateExpenseCategoryDto } from './dto/expense-category.dto';
import { ExpenseCategory } from './schemas/expense-category.schema';
import { Expense } from './schemas/expense.schema';

const toCents = (n: number | null | undefined) => (n == null ? null : Math.round(n * 100));

@Injectable()
export class ExpenseCategoriesService {
  constructor(
    @InjectModel(ExpenseCategory.name) private readonly categories: Model<ExpenseCategory>,
    @InjectModel(Expense.name) private readonly expenses: Model<Expense>,
  ) {}

  findAll(userId: string) {
    return this.categories.find({ userId }).sort({ createdAt: 1 }).exec();
  }

  async findOne(userId: string, id: string) {
    const category = await this.categories.findOne({ _id: id, userId }).exec();
    if (!category) throw new NotFoundException('Categoría no encontrada');
    return category;
  }

  create(userId: string, dto: CreateExpenseCategoryDto) {
    const { budget, ...rest } = dto;
    return this.categories.create({
      ...rest,
      description: dto.description ?? '',
      budgetCents: toCents(budget),
      userId: new Types.ObjectId(userId),
    });
  }

  async update(userId: string, id: string, dto: UpdateExpenseCategoryDto) {
    const category = await this.findOne(userId, id);
    category.set({
      name: dto.name ?? category.name,
      description: dto.description ?? category.description,
      color: dto.color ?? category.color,
      budgetCents: dto.budget === undefined ? category.budgetCents : toCents(dto.budget),
    });
    return category.save();
  }

  /** Borra la categoría; sus gastos quedan "Sin categoría" */
  async remove(userId: string, id: string) {
    const category = await this.findOne(userId, id);
    await this.expenses.updateMany(
      { userId, categoryId: category._id },
      { $set: { categoryId: null } },
    );
    await this.categories.deleteOne({ _id: id, userId });
  }

  /** Cuántos gastos tiene (para avisar antes de borrar) */
  async usage(userId: string, id: string) {
    await this.findOne(userId, id);
    return { expenses: await this.expenses.countDocuments({ userId, categoryId: id }) };
  }
}
