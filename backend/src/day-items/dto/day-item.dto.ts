import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsDateKey } from '../../recurrence/validators';
import { DAY_LISTS, type DayList } from '../schemas/day-item.schema';

export class DayItemQueryDto {
  @IsDateKey()
  date: string;

  @IsIn(DAY_LISTS)
  list: DayList;
}

export class CreateDayItemDto {
  @IsDateKey()
  date: string;

  @IsIn(DAY_LISTS)
  list: DayList;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;
}

export class UpdateDayItemDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  done?: boolean;

  /** Mover a otro día (queda al final de esa lista) */
  @IsOptional()
  @IsDateKey()
  date?: string;

  /** Cambiar de lista (queda al final) */
  @IsOptional()
  @IsIn(DAY_LISTS)
  list?: DayList;
}

export class ReorderDayItemsDto {
  @IsDateKey()
  date: string;

  @IsIn(DAY_LISTS)
  list: DayList;

  /** Ids en el orden nuevo; deben ser exactamente los de esa lista */
  @IsArray()
  @ArrayMaxSize(500)
  @IsMongoId({ each: true })
  ids: string[];
}

export class CarryOverDto {
  @IsDateKey()
  from: string;

  @IsDateKey()
  to: string;

  @IsIn(DAY_LISTS)
  list: DayList;
}
