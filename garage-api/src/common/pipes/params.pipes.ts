import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { TIME_RE, isValidDate } from '../time/time.utils';

/** Validates a `YYYY-MM-DD` path parameter. */
@Injectable()
export class ParseDatePipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isValidDate(value)) throw new BadRequestException('date must be a valid date (YYYY-MM-DD)');
    return value;
  }
}

/** Validates an `HH:MM` path parameter. */
@Injectable()
export class ParseTimePipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!TIME_RE.test(value)) throw new BadRequestException('time must be a time in HH:MM format');
    return value;
  }
}
