import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { DomainRuleError, type DomainErrorCode } from './domain.errors';

const statusByCode: Record<DomainErrorCode, HttpStatus> = {
  NOT_FOUND: HttpStatus.NOT_FOUND,
  INVALID_INPUT: HttpStatus.BAD_REQUEST,
  INVALID_ASSOCIATION: HttpStatus.BAD_REQUEST,
  INVALID_STATE_TRANSITION: HttpStatus.CONFLICT,
  CONFLICT: HttpStatus.CONFLICT,
  GROUP_FULL: HttpStatus.CONFLICT,
  LEADER_ALREADY_ASSIGNED: HttpStatus.CONFLICT,
  INVOICE_NOT_DUE: HttpStatus.CONFLICT,
};

/**
 * Translates domain rule violations into stable HTTP responses so the API never
 * leaks Prisma/driver errors and the UI can render a precise message.
 */
@Catch(DomainRuleError)
export class DomainExceptionFilter implements ExceptionFilter<DomainRuleError> {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: DomainRuleError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = statusByCode[exception.code] ?? HttpStatus.BAD_REQUEST;
    if (status >= 500) {
      this.logger.error(`${exception.code}: ${exception.message}`);
    }
    response.status(status).json({
      statusCode: status,
      error: exception.code,
      message: exception.message,
    });
  }
}
