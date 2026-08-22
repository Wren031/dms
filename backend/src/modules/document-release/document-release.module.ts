import { Module } from '@nestjs/common';
import { DocumentReleaseService } from './document-release.service';
import { DocumentReleaseController } from './document-release.controller';

@Module({
  controllers: [DocumentReleaseController],
  providers: [DocumentReleaseService],
  exports: [DocumentReleaseService],
})
export class DocumentReleaseModule {}
