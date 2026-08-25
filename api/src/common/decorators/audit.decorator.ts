import { SetMetadata } from '@nestjs/common';

export const AUDIT_METADATA_KEY = 'audit';

export interface AuditMetadata {
  action: string;
  module: string;
  targetType?: string;
}

export const Audit = (
  action: string,
  module: string,
  targetType?: string,
): MethodDecorator =>
  SetMetadata(AUDIT_METADATA_KEY, { action, module, targetType } satisfies AuditMetadata);
