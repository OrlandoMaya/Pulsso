import { OmitType, PartialType } from '@nestjs/mapped-types';
import {
  ArrayMaxSize,
  IsArray,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { IsDateKey, IsRRule } from '../../recurrence/validators';

export class CreateTaskDto {
  @IsMongoId()
  calendarId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsDateKey()
  startDate: string;

  @IsRRule()
  rrule: string;

  /** Programar un elemento de un proyecto: queda vinculado a él */
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ValidateIf((o) => o.projectId !== undefined)
  @Matches(/^[A-Za-z0-9_-]{1,40}$/)
  nodeId?: string;
}

export class UpdateTaskDto extends PartialType(OmitType(CreateTaskDto, ['projectId', 'nodeId'])) {}

export class ReorderTasksDto {
  /** Ids en el orden nuevo (los que se ven en la lista) */
  @IsArray()
  @ArrayMaxSize(500)
  @IsMongoId({ each: true })
  ids: string[];
}

export class CarryOverTasksDto {
  @IsDateKey()
  from: string;

  @IsDateKey()
  to: string;

  /** Solo estas categorías (si no, todas) */
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  calendarIds?: string[];
}
