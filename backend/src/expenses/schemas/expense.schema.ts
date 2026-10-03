import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { toJSONOptions } from '../../common/utils/serialize';

/** Un gasto de un día. El monto se guarda en centavos (entero) para no perder precisión */
@Schema({
  collection: 'expenses',
  timestamps: true,
  toJSON: {
    ...toJSONOptions,
    transform: (doc: unknown, ret: Record<string, any>) => {
      toJSONOptions.transform(doc, ret);
      ret.amount = ret.amountCents / 100;
      delete ret.amountCents;
      return ret;
    },
  },
})
export class Expense {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  userId: Types.ObjectId;

  /** Día del gasto (YYYY-MM-DD) */
  @Prop({ required: true })
  date: string;

  @Prop({ required: true, trim: true, maxlength: 120 })
  title: string;

  @Prop({ trim: true, maxlength: 2000, default: '' })
  description: string;

  @Prop({ required: true, min: 1 })
  amountCents: number;
}

export type ExpenseDocument = HydratedDocument<Expense>;
export const ExpenseSchema = SchemaFactory.createForClass(Expense);
ExpenseSchema.index({ userId: 1, date: 1 });
