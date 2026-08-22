import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { DocumentTrackingService } from './document-tracking.service';
import { RecordTrackingDto, FilterTrackingDto } from './dto/tracking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('document-tracking')
export class DocumentTrackingController {
  constructor(private readonly trackingService: DocumentTrackingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  record(@Body() dto: RecordTrackingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.trackingService.record(dto, user.id);
  }

  @Get()
  findAll(@Query() filter: FilterTrackingDto) {
    return this.trackingService.findAll(filter);
  }

  @Get('document/:documentId')
  findByDocument(@Param('documentId', new ParseUUIDPipe()) documentId: string) {
    return this.trackingService.findByDocument(documentId);
  }
}
