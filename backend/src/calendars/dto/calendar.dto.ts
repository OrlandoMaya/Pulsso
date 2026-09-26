import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CALENDAR_COLORS, type CalendarColor } from '../schemas/calendar.schema';

export class CreateCalendarDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name: string;

  @IsIn(CALENDAR_COLORS)
  color: CalendarColor;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}

export class UpdateCalendarDto extends PartialType(CreateCalendarDto) {}
