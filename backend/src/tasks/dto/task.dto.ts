import { PartialType } from '@nestjs/mapped-types';
import { IsMongoId, IsString, MaxLength, MinLength } from 'class-validator';
import { IsDateKey, IsRRule } from '../../recurrence/validators';

export class CreateTaskDto {
  @IsMongoId()
  calendarId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title: string;

  @IsDateKey()
  startDate: string;

  @IsRRule()
  rrule: string;
}

export class UpdateTaskDto extends PartialType(CreateTaskDto) {}
