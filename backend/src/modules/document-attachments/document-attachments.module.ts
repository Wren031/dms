import { Module } from '@nestjs/common';
import { DocumentAttachmentsService } from './document-attachments.service';
import { DocumentAttachmentsController } from './document-attachments.controller';
import { S3StorageService } from './s3-storage.service';

@Module({
  controllers: [DocumentAttachmentsController],
  providers: [DocumentAttachmentsService, S3StorageService],
  exports: [DocumentAttachmentsService, S3StorageService],
})
export class DocumentAttachmentsModule {}
