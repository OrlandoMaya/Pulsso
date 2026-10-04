import { PartialType } from '@nestjs/mapped-types';
import {
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { IsDateKey } from '../../recurrence/validators';

export class CreateExpenseDto {
  @IsDateKey()
  date: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /** En la moneda, con hasta 2 decimales (p. ej. 1250.5) */
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(10_000_000_000)
  amount: number;

  /** null = sin categoría */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsMongoId()
  categoryId?: string | null;
}

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}

export class ExpenseRangeDto {
  @IsDateKey()
  from: string;

  @IsDateKey()
  to: string;
}
