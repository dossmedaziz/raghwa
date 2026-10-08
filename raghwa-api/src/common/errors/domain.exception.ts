import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Business-rule error with a stable machine-readable `code` the frontends can translate,
 * e.g. `{ statusCode: 409, code: 'SLOT_FULL', message: 'This slot is fully booked' }`.
 */
export class DomainException extends HttpException {
  constructor(status: HttpStatus, readonly code: string, message: string, details?: unknown) {
    super({ statusCode: status, code, message, ...(details === undefined ? {} : { details }) }, status);
  }
}

export const notFound = (code: string, message: string) => new DomainException(HttpStatus.NOT_FOUND, code, message);
export const conflict = (code: string, message: string, details?: unknown) =>
  new DomainException(HttpStatus.CONFLICT, code, message, details);
export const unprocessable = (code: string, message: string, details?: unknown) =>
  new DomainException(HttpStatus.UNPROCESSABLE_ENTITY, code, message, details);
export const unauthorized = (code: string, message: string) => new DomainException(HttpStatus.UNAUTHORIZED, code, message);
export const forbidden = (code: string, message: string) => new DomainException(HttpStatus.FORBIDDEN, code, message);
export const tooManyRequests = (code: string, message: string, details?: unknown) =>
  new DomainException(HttpStatus.TOO_MANY_REQUESTS, code, message, details);
