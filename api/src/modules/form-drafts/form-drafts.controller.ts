import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FormDraftsService, FormDraftDto } from './form-drafts.service';
import { UpsertFormDraftDto } from './dto/upsert-form-draft.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('form-drafts')
export class FormDraftsController {
  constructor(private readonly formDraftsService: FormDraftsService) {}

  @Get(':formKey')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  async getDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param('formKey') formKey: string,
  ): Promise<FormDraftDto | null> {
    return this.formDraftsService.getDraft(user.id, formKey);
  }

  @Post(':formKey')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  async upsert(
    @CurrentUser() user: AuthenticatedUser,
    @Param('formKey') formKey: string,
    @Body() dto: UpsertFormDraftDto,
  ): Promise<FormDraftDto> {
    return this.formDraftsService.upsertDraft(user.id, formKey, dto.payload);
  }

  @Delete(':formKey')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async clear(
    @CurrentUser() user: AuthenticatedUser,
    @Param('formKey') formKey: string,
  ): Promise<void> {
    await this.formDraftsService.clearDraft(user.id, formKey);
  }
}
