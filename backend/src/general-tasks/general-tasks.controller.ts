import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { ReorderTasksDto } from '../tasks/dto/task.dto';
import { CreateGeneralTaskDto, DiagramDto, UpdateGeneralTaskDto } from './dto/general-task.dto';
import { GeneralTasksService } from './general-tasks.service';

@Controller('general-tasks')
export class GeneralTasksController {
  constructor(private readonly items: GeneralTasksService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.items.findAll(user.userId);
  }

  @Put('order')
  reorder(@CurrentUser() user: AuthUser, @Body() dto: ReorderTasksDto) {
    return this.items.reorder(user.userId, dto.ids);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.items.findOne(user.userId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateGeneralTaskDto) {
    return this.items.create(user.userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateGeneralTaskDto,
  ) {
    return this.items.update(user.userId, id, dto);
  }

  @Put(':id/diagram')
  saveDiagram(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: DiagramDto,
  ) {
    return this.items.saveDiagram(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.items.remove(user.userId, id);
  }
}
