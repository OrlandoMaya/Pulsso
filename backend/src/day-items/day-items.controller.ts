import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { DayItemsService } from './day-items.service';
import {
  CarryOverDto,
  CreateDayItemDto,
  DayItemQueryDto,
  ReorderDayItemsDto,
  UpdateDayItemDto,
} from './dto/day-item.dto';

@Controller('day-items')
export class DayItemsController {
  constructor(private readonly items: DayItemsService) {}

  /** GET /api/day-items?date=2026-09-26&list=work */
  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: DayItemQueryDto) {
    return this.items.list(user.userId, q.date, q.list);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDayItemDto) {
    return this.items.create(user.userId, dto);
  }

  @Put('order')
  reorder(@CurrentUser() user: AuthUser, @Body() dto: ReorderDayItemsDto) {
    return this.items.reorder(user.userId, dto.date, dto.list, dto.ids);
  }

  @Post('carry-over')
  @HttpCode(200)
  carryOver(@CurrentUser() user: AuthUser, @Body() dto: CarryOverDto) {
    return this.items.carryOver(user.userId, dto.from, dto.to, dto.list);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateDayItemDto,
  ) {
    return this.items.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.items.remove(user.userId, id);
  }
}
