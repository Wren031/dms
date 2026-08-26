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
import { DocumentRoutingService } from './document-routing.service';
import { CreateRoutingPlanDto } from './dto/create-routing-plan.dto';
import {
  UpdateRoutingStepDto,
  AdvanceRoutingStepDto,
} from './dto/update-routing-step.dto';
import { FilterRoutingStepsDto } from './dto/filter-routing-steps.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { ROLES } from '../../common/constants/roles.constants';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('document-routing')
export class DocumentRoutingController {
  constructor(private readonly routingService: DocumentRoutingService) {}

  @Roles(ROLES.SYSTEM_ADMIN, ROLES.OFFICE_ADMIN, ROLES.DOCUMENT_OFFICER)
  @Audit('routing.create-plan', 'routing', 'DocumentRoutingStep')
  @Post('document/:documentId/plan')
  @HttpCode(HttpStatus.CREATED)
  createPlan(
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @Body() dto: CreateRoutingPlanDto,
  ) {
    return this.routingService.createPlan(documentId, dto);
  }

  @Get()
  findAll(@Query() filter: FilterRoutingStepsDto) {
    return this.routingService.findAll(filter);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.routingService.findOne(id);
  }

  @Patch(':id')
  @Audit('routing.update', 'routing', 'DocumentRoutingStep')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRoutingStepDto,
  ) {
    return this.routingService.update(id, dto);
  }

  @Post(':id/advance')
  @HttpCode(HttpStatus.OK)
  @Audit('routing.advance', 'routing', 'DocumentRoutingStep')
  advance(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AdvanceRoutingStepDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.routingService.advance(id, dto, user.id);
  }

  @Roles(ROLES.SYSTEM_ADMIN, ROLES.OFFICE_ADMIN)
  @Audit('routing.delete', 'routing', 'DocumentRoutingStep')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.routingService.remove(id);
  }
}
