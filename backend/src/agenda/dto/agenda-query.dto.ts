import { Transform } from 'class-transformer';
import { IsArray, IsMongoId, IsOptional } from 'class-validator';
import { IsDateKey } from '../../recurrence/validators';

export class AgendaQueryDto {
  /** Primer día, inclusive (YYYY-MM-DD) */
  @IsDateKey()
  from: string;

  /** Último día, inclusive (YYYY-MM-DD) */
  @IsDateKey()
  to: string;

  /** ?calendarIds=a,b — si no se manda, se usan los calendarios visibles */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
  @IsArray()
  @IsMongoId({ each: true })
  calendarIds?: string[];
}
