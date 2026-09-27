import { Controller, Get, Param, Query } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { AgendaService } from './agenda.service';
import { AgendaQueryDto } from './dto/agenda-query.dto';

@Controller('agenda')
export class AgendaController {
  constructor(private readonly agenda: AgendaService) {}

  /** Semana o mes: GET /api/agenda?from=2026-09-21&to=2026-09-27 */
  @Get()
  range(@CurrentUser() user: AuthUser, @Query() q: AgendaQueryDto) {
    return this.agenda.range(user.userId, q.from, q.to, q.calendarIds);
  }

  /** Modal del día: GET /api/agenda/day/2026-09-26 */
  @Get('day/:date')
  day(@CurrentUser() user: AuthUser, @Param('date') date: string) {
    return this.agenda.day(user.userId, date);
  }
}
