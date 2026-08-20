import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../modules/audit-module/audit.service';
import { AuthenticatedUser } from '../types/authenticated-user.type';

const AUDITED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Records a generic HTTP_AUDIT entry for every successful mutating request.
 * Security-sensitive events (login, logout, password changes, ...) are
 * recorded explicitly by the AuthService with dedicated actions.
 *
 * Request bodies are never captured - they may contain credentials.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method = request.method as string;

    if (!AUDITED_METHODS.has(method)) {
      return next.handle();
    }

    const user = request.user as AuthenticatedUser | undefined;
    const ipAddress = request.ip as string | undefined;
    const userAgent = request.headers?.['user-agent'] as string | undefined;

    return next.handle().pipe(
      tap({
        next: () => {
          void this.auditService
            .log({
              userId: user?.id ?? null,
              action: 'HTTP_REQUEST',
              resource: `${method} ${request.route?.path ?? request.url}`,
              resourceId: null,
              ipAddress,
              userAgent,
              metadata: {
                path: request.originalUrl,
              },
            })
            .catch((error: unknown) => {
              this.logger.warn(
                `Audit log write failed: ${error instanceof Error ? error.message : 'unknown'}`,
              );
            });
        },
      }),
    );
  }
}
