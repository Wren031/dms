import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface TransformResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, TransformResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<TransformResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        if (data === null || data === undefined) {
          return { data: data as T };
        }
        if (
          typeof data === 'object' &&
          data !== null &&
          'data' in (data as object) &&
          Object.keys(data as object).length <= 2 &&
          ('meta' in (data as object) || Object.keys(data as object).length === 1)
        ) {
          return data as unknown as TransformResponse<T>;
        }
        return { data };
      }),
    );
  }
}
