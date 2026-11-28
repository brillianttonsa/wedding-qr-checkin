import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = isHttp
      ? exception.getResponse()
      : { message: 'Internal server error' };
    if (!isHttp) {
      const errorName =
        exception instanceof Error ? exception.name : 'UnknownError';
      const stackFrames =
        exception instanceof Error
          ? exception.stack
              ?.split('\n')
              .filter((line) => /^\s*at\s/.test(line))
              .join('\n')
          : undefined;
      this.logger.error(
        `Unhandled ${errorName} for ${request.method} ${request.path}`,
        stackFrames,
      );
    }
    response
      .status(status)
      .json({ statusCode: status, path: request.url, error: payload });
  }
}
