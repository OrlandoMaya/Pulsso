import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { CALENDAR_COLORS, type CalendarColor } from '../../calendars/schemas/calendar.schema';
import { toJSONOptions } from '../../common/utils/serialize';

/** Categoría de gastos con presupuesto mensual (en centavos; null = sin presupuesto) */
@Schema({
  collection: 'expense_categories',
  timestamps: true,
  toJSON: {
    ...toJSONOptions,
    transform: (doc: unknown, ret: Record<string, any>) => {
      toJSONOptions.transform(doc, ret);
      ret.budget = ret.budgetCents == null ? null : ret.budgetCents / 100;
      delete ret.budgetCents;
      return ret;
    },
  },
})
export class ExpenseCategory {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 60 })
  name: string;

  @Prop({ trim: true, maxlength: 500, default: '' })
  description: string;

  @Prop({ required: true, enum: CALENDAR_COLORS })
  color: CalendarColor;

  @Prop({ type: Number, default: null, min: 0 })
  budgetCents: number | null;
}

export type ExpenseCategoryDocument = HydratedDocument<ExpenseCategory>;
export const ExpenseCategorySchema = SchemaFactory.createForClass(ExpenseCategory);
