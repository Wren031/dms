import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { ApiErrorBody } from './api-error.type';

/**
 * Central exception filter producing a consistent error envelope:
 *   { success: false, message, statusCode }
 *
 * Never leaks database errors, stack traces or internal details in
 * production. Prisma errors are translated into a generic 500.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const body = this.buildBody(exception);
    const isServerError = body.statusCode >= 500;

    if (isServerError) {
      this.logger.error(
        `${request.method} ${request.url} -> ${body.statusCode} ${exception instanceof Error ? exception.message : 'Unknown error'}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(body.statusCode).json(body);
  }

  private buildBody(exception: unknown): ApiErrorBody {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        return { success: false, message: exceptionResponse, statusCode };
      }

      const message = (exceptionResponse as { message?: string | string[] }).message;
      if (Array.isArray(message)) {
        return {
          success: false,
          message: 'Validation failed',
          statusCode,
          errors: message,
        };
      }

      return {
        success: false,
        message: typeof message === 'string' ? message : exception.message,
        statusCode,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.warn(`Prisma error ${exception.code}`);
      return {
        success: false,
        message: 'Internal server error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }

    if (this.configService.get<boolean>('isProduction', false)) {
      return {
        success: false,
        message: 'Internal server error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }

    return {
      success: false,
      message: exception instanceof Error ? exception.message : 'Internal server error',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    };
  }
}
