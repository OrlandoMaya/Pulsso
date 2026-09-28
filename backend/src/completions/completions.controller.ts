import { Body, Controller, Put } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { CompletionsService } from './completions.service';
import { SetCompletionDto, SetSubtaskCompletionDto } from './dto/completion.dto';

@Controller('completions')
export class CompletionsController {
  constructor(private readonly completions: CompletionsService) {}

  /** Tacha o destacha una ocurrencia (idempotente) */
  @Put()
  set(@CurrentUser() user: AuthUser, @Body() dto: SetCompletionDto) {
    return this.completions.set(user.userId, dto);
  }

  /** Tacha o destacha una subtarea en un día; la tarea queda hecha cuando están todas */
  @Put('subtask')
  setSubtask(@CurrentUser() user: AuthUser, @Body() dto: SetSubtaskCompletionDto) {
    return this.completions.setSubtask(user.userId, dto);
  }
}
