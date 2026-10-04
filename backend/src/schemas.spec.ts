import { model, Schema } from 'mongoose';
import { CalendarSchema } from './calendars/schemas/calendar.schema';
import { CompletionSchema } from './completions/schemas/completion.schema';
import { SubtaskCompletionSchema } from './completions/schemas/subtask-completion.schema';
import { DayItemSchema } from './day-items/schemas/day-item.schema';
import { EventSchema } from './events/schemas/event.schema';
import { ExpenseCategorySchema } from './expenses/schemas/expense-category.schema';
import { ExpenseSchema } from './expenses/schemas/expense.schema';
import { GeneralTaskSchema } from './general-tasks/schemas/general-task.schema';
import { TaskSchema } from './tasks/schemas/task.schema';

/**
 * Las consultas filtran por ids en texto (del JWT o de la URL). Si un campo de referencia
 * no es ObjectId en el esquema, Mongoose no convierte el texto y la consulta no encuentra
 * nada aunque el documento exista (pasó con `type: Types.ObjectId` en Mongoose 9).
 */
const refs: [string, Schema, string[]][] = [
  ['Calendar', CalendarSchema, ['userId']],
  ['Event', EventSchema, ['userId', 'calendarId', 'projectId']],
  ['Task', TaskSchema, ['userId', 'calendarId', 'projectId']],
  ['GeneralTask', GeneralTaskSchema, ['userId', 'calendarId']],
  ['Expense', ExpenseSchema, ['userId', 'categoryId']],
  ['ExpenseCategory', ExpenseCategorySchema, ['userId']],
  ['DayItem', DayItemSchema, ['userId']],
  ['Completion', CompletionSchema, ['userId', 'sourceId']],
  ['SubtaskCompletion', SubtaskCompletionSchema, ['userId', 'taskId']],
];

describe('esquemas: campos de referencia', () => {
  it.each(refs)('%s usa ObjectId y convierte los filtros en texto', (name, schema, paths) => {
    const Model = model(`Spec${name}`, schema);
    const id = '507f1f77bcf86cd799439011';
    for (const path of paths) {
      expect(schema.path(path).instance).toBe('ObjectId');
      const query = Model.find({ [path]: id });
      query.cast(Model);
      expect(query.getFilter()[path]?.constructor?.name).toBe('ObjectId');
    }
  });
});
