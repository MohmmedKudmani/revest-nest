import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { Request } from 'express'

const ACTIONS: Record<string, string> = {
  POST: 'created',
  PATCH: 'updated',
  DELETE: 'deleted',
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle()

    const req = context.switchToHttp().getRequest<Request>()
    const action = ACTIONS[req.method]

    return next.handle().pipe(
      map((data: unknown) => {
        if (!action) return data
        return { message: `Order ${action} successfully`, data }
      }),
    )
  }
}
