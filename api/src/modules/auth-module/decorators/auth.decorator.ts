import { applyDecorators } from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator';

/**
 * Marks an authentication endpoint as publicly accessible (bypasses the
 * global JwtAuthGuard). Authentication endpoints are additionally protected
 * by the stricter 'auth' rate limiter configured in AppModule.
 */
export const PublicAuth = () => applyDecorators(Public());
