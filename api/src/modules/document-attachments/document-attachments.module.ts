import { Module } from '@nestjs/common';
import { DocumentAttachmentsService } from './document-attachments.service';
import { DocumentAttachmentsController } from './document-attachments.controller';
import { LocalStorageService } from './local-storage.service';

@Module({
  controllers: [DocumentAttachmentsController],
  providers: [DocumentAttachmentsService, LocalStorageService],
  exports: [DocumentAttachmentsService, LocalStorageService],
})
export class DocumentAttachmentsModule {}
