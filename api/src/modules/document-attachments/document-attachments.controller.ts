import {
  BadRequestException,
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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { DocumentAttachmentsService } from './document-attachments.service';
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

  @Roles(ROLES.SYSTEM_ADMIN, ROLES.OFFICE_ADMIN, ROLES.DOCUMENT_ENCODER)
  @Post('document/:documentId')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  @Audit('attachment.upload', 'attachments', 'DocumentAttachment')
  @HttpCode(HttpStatus.CREATED)
  upload(
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.attachmentsService.upload(documentId, file, user.id);
  }

  @Get('document/:documentId')
  findAll(@Param('documentId', new ParseUUIDPipe()) documentId: string) {
    return this.attachmentsService.findAll(documentId);
  }

  @Get()
  findByQuery(@Query() filter: FilterAttachmentsDto) {
    return this.attachmentsService.findByDocumentFilter(filter.documentId);
  }

  @Get(':id/download')
  async download(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res() res: Response,
  ) {
    const info = await this.attachmentsService.getDownloadInfo(id);
    res.setHeader('Content-Type', info.mimeType);
    res.setHeader('Content-Length', String(info.sizeBytes));
    res.download(
      info.absolutePath,
      info.fileName,
      (err: Error | undefined) => {
        if (err && !res.headersSent) {
          // eslint-disable-next-line no-console
          console.error('Attachment download failed', err);
          res.status(500).end();
        }
      },
    );
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
