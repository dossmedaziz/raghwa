import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, ValidateBy, buildMessage, type ValidationOptions } from 'class-validator';
import { TIME_RE, isValidDate } from '../time/time.utils';

/** Tunisian mobile/landline number: 8 digits, first digit 2-9. Spaces and dashes are stripped first ("98 123 456" → "98123456"). */
export const PHONE_RE = /^[2-9]\d{7}$/;

const stripPhone = Transform(({ value }) => (typeof value === 'string' ? value.replace(/[\s-]/g, '') : value));

export function PhoneField(opts: { optional?: boolean; description?: string } = {}) {
  const doc = { example: '98123456', description: opts.description ?? '8-digit Tunisian number (spaces allowed).' };
  return applyDecorators(
    opts.optional ? ApiPropertyOptional(doc) : ApiProperty(doc),
    stripPhone,
    ...(opts.optional ? [IsOptional()] : []),
    IsString(),
    Matches(PHONE_RE, { message: '$property must be an 8-digit Tunisian phone number' }),
  );
}

export function IsCalendarDate(options?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isCalendarDate',
      validator: {
        validate: (value) => typeof value === 'string' && isValidDate(value),
        defaultMessage: buildMessage((each) => `${each}$property must be a valid date (YYYY-MM-DD)`, options),
      },
    },
    options,
  );
}

export function DateField(opts: { optional?: boolean; description?: string; example?: string } = {}) {
  const doc = { example: opts.example ?? '2026-10-21', format: 'date', description: opts.description };
  return applyDecorators(
    opts.optional ? ApiPropertyOptional(doc) : ApiProperty(doc),
    ...(opts.optional ? [IsOptional()] : []),
    IsCalendarDate(),
  );
}

export function TimeField(opts: { optional?: boolean; description?: string; example?: string } = {}) {
  const doc = { example: opts.example ?? '09:30', pattern: TIME_RE.source, description: opts.description ?? 'Local time, HH:MM (24h).' };
  return applyDecorators(
    opts.optional ? ApiPropertyOptional(doc) : ApiProperty(doc),
    ...(opts.optional ? [IsOptional()] : []),
    IsString(),
    Matches(TIME_RE, { message: '$property must be a time in HH:MM format' }),
  );
}

/** Trims strings before validation so "   " fails a MinLength/IsNotEmpty check. */
export const Trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
