import { Module } from '@nestjs/common';
import { FormDraftsController } from './form-drafts.controller';
import { FormDraftsService } from './form-drafts.service';

@Module({
  controllers: [FormDraftsController],
  providers: [FormDraftsService],
  exports: [FormDraftsService],
})
export class FormDraftsModule {}
