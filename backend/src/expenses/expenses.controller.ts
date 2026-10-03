import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { CreateExpenseDto, ExpenseRangeDto, UpdateExpenseDto } from './dto/expense.dto';
import { ExpensesService } from './expenses.service';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: ExpenseRangeDto) {
    return this.expenses.list(user.userId, q.from, q.to);
  }

  /** Gastado por día, total, promedio, día de más gasto y total histórico */
  @Get('summary')
  summary(@CurrentUser() user: AuthUser, @Query() q: ExpenseRangeDto) {
    return this.expenses.summary(user.userId, q.from, q.to);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateExpenseDto) {
    return this.expenses.create(user.userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expenses.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.expenses.remove(user.userId, id);
  }
}
