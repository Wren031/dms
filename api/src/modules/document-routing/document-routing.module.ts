import { Module } from '@nestjs/common';
import { DocumentRoutingService } from './document-routing.service';
import { DocumentRoutingController } from './document-routing.controller';

@Module({
  controllers: [DocumentRoutingController],
  providers: [DocumentRoutingService],
  exports: [DocumentRoutingService],
})
export class DocumentRoutingModule {}
