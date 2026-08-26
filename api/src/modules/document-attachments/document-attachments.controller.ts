import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DocumentAttachmentsService } from './document-attachments.service';
import { UploadAttachmentDto } from './dto/upload-attachment.dto';
import { UpdateAttachmentDto } from './dto/update-attachment.dto';
import { FilterAttachmentsDto } from './dto/filter-attachments.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { ROLES } from '../../common/constants/roles.constants';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('document-attachments')
export class DocumentAttachmentsController {
  constructor(private readonly attachmentsService: DocumentAttachmentsService) {}

  @Roles(ROLES.SYSTEM_ADMIN, ROLES.OFFICE_ADMIN, ROLES.DOCUMENT_ENCODER, ROLES.DOCUMENT_OFFICER)
  @Post('document/:documentId/upload-url')
  @HttpCode(HttpStatus.OK)
  createUploadUrl(
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @Body() dto: UploadAttachmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attachmentsService.createUpload(documentId, dto, user.id);
  }

  @Roles(ROLES.SYSTEM_ADMIN, ROLES.OFFICE_ADMIN, ROLES.DOCUMENT_ENCODER, ROLES.DOCUMENT_OFFICER)
  @Audit('attachment.confirm', 'attachments', 'DocumentAttachment')
  @Post('document/:documentId/confirm')
  @HttpCode(HttpStatus.CREATED)
  confirm(
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @Body() dto: UploadAttachmentDto & { storageKey: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attachmentsService.confirm(documentId, dto, user.id);
  }

  @Get('document/:documentId')
  findAll(@Param('documentId', new ParseUUIDPipe()) documentId: string) {
    return this.attachmentsService.findAll(documentId);
  }

  @Get()
  findByQuery(@Query() filter: FilterAttachmentsDto) {
    if (!filter.documentId) return [];
    return this.attachmentsService.findAll(filter.documentId);
  }

  @Get(':id/download')
  getDownloadUrl(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.attachmentsService.getDownloadUrl(id);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAttachmentDto,
  ) {
    return this.attachmentsService.update(id, dto);
  }

  @Roles(ROLES.SYSTEM_ADMIN, ROLES.OFFICE_ADMIN, ROLES.DOCUMENT_ENCODER)
  @Audit('attachment.delete', 'attachments', 'DocumentAttachment')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.attachmentsService.remove(id);
  }
}
