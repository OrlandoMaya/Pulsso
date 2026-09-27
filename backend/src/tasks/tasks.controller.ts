import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { ExdateDto } from '../events/dto/event.dto';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.tasks.findAll(user.userId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.tasks.findOne(user.userId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) {
    return this.tasks.create(user.userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.tasks.remove(user.userId, id);
  }

  @Post(':id/exdates')
  addExdate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: ExdateDto,
  ) {
    return this.tasks.addExdate(user.userId, id, dto.date);
  }
}
