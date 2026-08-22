import { Module } from '@nestjs/common';
import { DocumentArchiveService } from './document-archive.service';
import { DocumentArchiveController } from './document-archive.controller';

@Module({
  controllers: [DocumentArchiveController],
  providers: [DocumentArchiveService],
  exports: [DocumentArchiveService],
})
export class DocumentArchiveModule {}
