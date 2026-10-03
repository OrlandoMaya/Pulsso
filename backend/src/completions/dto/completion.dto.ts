import { IsBoolean, IsIn, IsMongoId, Matches } from 'class-validator';
import { IsDateKey } from '../../recurrence/validators';
import { SOURCE_TYPES, type SourceType } from '../schemas/completion.schema';

export class SetCompletionDto {
  @IsIn(SOURCE_TYPES)
  sourceType: SourceType;

  @IsMongoId()
  sourceId: string;

  @IsDateKey()
  date: string;

  /** true = tachar, false = destachar */
  @IsBoolean()
  done: boolean;
}

export class SetSubtaskCompletionDto {
  @IsMongoId()
  taskId: string;

  @Matches(/^[A-Za-z0-9_-]{1,40}$/)
  subtaskId: string;

  @IsDateKey()
  date: string;

  @IsBoolean()
  done: boolean;
}
