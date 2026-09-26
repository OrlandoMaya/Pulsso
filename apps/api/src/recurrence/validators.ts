import { Matches, ValidateBy, ValidationOptions } from 'class-validator';
import { DATE_RE, DATETIME_RE } from '../common/utils/date';
import { isValidRRule } from './recurrence';

export const IsDateKey = () => Matches(DATE_RE, { message: '$property debe tener formato YYYY-MM-DD' });

export const IsLocalDateTime = () =>
  Matches(DATETIME_RE, { message: '$property debe tener formato YYYY-MM-DDTHH:mm' });

export const IsRRule = (options?: ValidationOptions) =>
  ValidateBy(
    {
      name: 'isRRule',
      validator: {
        validate: (value: unknown) => typeof value === 'string' && isValidRRule(value),
        defaultMessage: () =>
          '$property debe ser una regla RRULE válida, p. ej. FREQ=WEEKLY;BYDAY=MO,WE,FR',
      },
    },
    options,
  );
