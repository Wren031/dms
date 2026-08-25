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
import { SkipThrottle } from '@nestjs/throttler';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { FilterDocumentsDto } from './dto/filter-documents.dto';
import { TransitionDocumentDto } from './dto/transition-document.dto';
import { AssignDocumentHolderDto } from './dto/assign-document-holder.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { ROLES } from '../../common/constants/roles.constants';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Roles(ROLES.SYSTEM_ADMIN, ROLES.OFFICE_ADMIN, ROLES.DOCUMENT_ENCODER, ROLES.RECEIVING_OFFICER)
  @Audit('document.register', 'documents', 'Document')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateDocumentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.create(dto, user.id);
  }

  @SkipThrottle()
  @Get()
  findAll(@Query() filter: FilterDocumentsDto) {
    return this.documentsService.findAll(filter);
  }

  @SkipThrottle()
  @Roles(ROLES.SYSTEM_ADMIN, ROLES.OFFICE_ADMIN, ROLES.DOCUMENT_ENCODER, ROLES.RECEIVING_OFFICER)
  @Get('document-number-suggestion/:officeId')
  suggestDocumentNumber(
    @Param('officeId', new ParseUUIDPipe()) officeId: string,
  ) {
    return this.documentsService.getDocumentNumberSuggestion(officeId);
  }

  @SkipThrottle()
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.documentsService.findOne(id);
  }

  @Roles(ROLES.SYSTEM_ADMIN, ROLES.OFFICE_ADMIN, ROLES.DOCUMENT_ENCODER)
  @Audit('document.update', 'documents', 'Document')
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(id, dto);
  }

  @Roles(ROLES.SYSTEM_ADMIN, ROLES.OFFICE_ADMIN)
  @Audit('document.delete', 'documents', 'Document')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.documentsService.remove(id);
  }

  @Post(':id/transition')
  @HttpCode(HttpStatus.OK)
  @Audit('document.transition', 'documents', 'Document')
  transition(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: TransitionDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.transition(id, dto, user.id);
  }

  @Post(':id/assign-holder')
  @HttpCode(HttpStatus.OK)
  @Audit('document.assign-holder', 'documents', 'Document')
  assignHolder(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AssignDocumentHolderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.assignHolder(id, dto, user.id);
  }

  @SkipThrottle()
  @Get(':id/history')
  getHistory(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.documentsService.getHistory(id);
  }

  @SkipThrottle()
  @Get(':id/timeline')
  getTimeline(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.documentsService.getTimeline(id);
  }
}
