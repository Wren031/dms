import { Module } from '@nestjs/common';
import { DocumentTrackingService } from './document-tracking.service';
import { DocumentTrackingController } from './document-tracking.controller';

@Module({
  controllers: [DocumentTrackingController],
  providers: [DocumentTrackingService],
  exports: [DocumentTrackingService],
})
export class DocumentTrackingModule {}
