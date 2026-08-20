import { Global, Module } from '@nestjs/common';
import { AuthorizationService } from './services/authorization.service';
import { OwnershipGuard } from './guards/ownership.guard';

/**
 * Global shared module for cross-cutting security infrastructure used by
 * every future feature module (ownership/IDOR protection, authorization).
 */
@Global()
@Module({
  providers: [AuthorizationService, OwnershipGuard],
  exports: [AuthorizationService, OwnershipGuard],
})
export class CommonModule {}
