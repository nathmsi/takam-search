import { STATUS_CODES } from 'node:http';
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { ApiErrorDto } from '@takam/contracts';
import type { Request, Response } from 'express';

/**
 * Every error of the API has the same JSON body ({@link ApiErrorDto}), whatever raised it: a validation, a missing route,
 * a bug. A bug is logged with its stack and never shown to the caller. (The Takam site answers a wrong address with its
 * home page and a 200: a client cannot tell.)
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger: Logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request: Request = http.getRequest<Request>();
    const status: number = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    if (status >= 500) this.logger.error(`${request.method} ${request.originalUrl}`, exception instanceof Error ? exception.stack : String(exception));
    const body: ApiErrorDto = {
      statusCode: status,
      error: STATUS_CODES[status] ?? 'Error',
      message: status >= 500 ? 'Internal server error' : messageOf(exception),
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    };
    http.getResponse<Response>().status(status).json(body);
  }
}

function messageOf(exception: unknown): string {
  if (!(exception instanceof HttpException)) return 'Error';
  const response: string | object = exception.getResponse();
  if (typeof response === 'string') return response;
  const message: unknown = (response as { message?: unknown }).message;
  return Array.isArray(message) ? message.join('; ') : String(message ?? exception.message);
}
