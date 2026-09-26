import { IsBoolean, IsIn, IsMongoId } from 'class-validator';
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
