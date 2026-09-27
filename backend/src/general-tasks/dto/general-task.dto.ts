import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  NODE_STATUSES,
  NODE_TYPES,
  type NodeStatus,
  type NodeType,
} from '../schemas/general-task.schema';

const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const idMessage = { message: '$property debe ser un id corto (letras, números, - o _)' };

export class CreateGeneralTaskDto {
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

  /** Un proyecto abre el diagrama de actividades */
  @IsOptional()
  @IsBoolean()
  isProject?: boolean;
}

export class UpdateGeneralTaskDto extends PartialType(
  OmitType(CreateGeneralTaskDto, ['isProject']),
) {
  @IsOptional()
  @IsBoolean()
  done?: boolean;
}

export class NodeDto {
  @Matches(ID_RE, idMessage)
  id: string;

  @IsIn(NODE_TYPES)
  type: NodeType;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-100_000)
  @Max(100_000)
  x: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-100_000)
  @Max(100_000)
  y: number;

  @IsOptional()
  @IsIn(NODE_STATUSES)
  status?: NodeStatus;
}

export class EdgeDto {
  @Matches(ID_RE, idMessage)
  id: string;

  @Matches(ID_RE, idMessage)
  source: string;

  @Matches(ID_RE, idMessage)
  target: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(20)
  sourceHandle?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(20)
  targetHandle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  label?: string;
}

export class DiagramDto {
  @IsArray()
  @ArrayMaxSize(300)
  @ValidateNested({ each: true })
  @Type(() => NodeDto)
  nodes: NodeDto[];

  @IsArray()
  @ArrayMaxSize(600)
  @ValidateNested({ each: true })
  @Type(() => EdgeDto)
  edges: EdgeDto[];
}
