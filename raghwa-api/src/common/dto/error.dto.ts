import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Shape of every error response (documentation only). */
export class ErrorResponseDto {
  @ApiProperty({ example: 409 }) statusCode: number;
  @ApiPropertyOptional({ example: 'SLOT_FULL', description: 'Stable code for business-rule errors; absent on generic HTTP errors.' })
  code?: string;
  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'This slot is fully booked',
    description: 'Human-readable message, or the list of validation errors for 400 responses.',
  })
  message: string | string[];
  @ApiPropertyOptional({ example: 'Conflict' }) error?: string;
}
