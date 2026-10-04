import { PartialType } from '@nestjs/mapped-types';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { CALENDAR_COLORS, type CalendarColor } from '../../calendars/schemas/calendar.schema';

export class CreateExpenseCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsIn(CALENDAR_COLORS)
  color: CalendarColor;

  /** Presupuesto mensual; null = sin presupuesto */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10_000_000_000)
  budget?: number | null;
}

export class UpdateExpenseCategoryDto extends PartialType(CreateExpenseCategoryDto) {}
