import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsMongoId, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { IsDateKey, IsLocalDateTime, IsRRule } from '../../recurrence/validators';

export class CreateEventDto {
  @IsMongoId()
  calendarId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  /** "2026-09-21T09:00" */
  @IsLocalDateTime()
  start: string;

  @IsLocalDateTime()
  end: string;

  /** null para quitar la repetición */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsRRule()
  rrule?: string | null;

  @IsOptional()
  @IsBoolean()
  checkable?: boolean;
}

export class UpdateEventDto extends PartialType(CreateEventDto) {}

export class ExdateDto {
  @IsDateKey()
  date: string;
}
