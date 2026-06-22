import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Response } from 'express'

// Catches every exception (HTTP or otherwise) and returns a consistent
// { status, message } shape so clients never see raw NestJS error objects.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    const raw =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Something went wrong. Please try again later.'

    // NestJS and nestjs-zod wrap the message inside a { message } object —
    // unwrap it so the client receives a plain string, not a nested object.
    const message =
      typeof raw === 'object' && raw !== null && 'message' in raw
        ? (raw as Record<string, unknown>).message
        : raw

    // Log the stack for unexpected errors only; HTTP exceptions are intentional
    // and don't need to pollute the server logs.
    if (!(exception instanceof HttpException)) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      )
    }

    response.status(status).json({ status, message })
  }
}
