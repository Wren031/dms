import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';

import { Request } from 'express';

import { OfficeService } from './office.service';
import { CreateOfficeDto } from './dto/create-office.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';

@Controller('offices')
export class OfficeController {
  constructor(
    private readonly officeService: OfficeService,
  ) {}

  @Post()
  createOffice(
    @Body() dto: CreateOfficeDto,
    @Req() req: Request,
  ) {
    return this.officeService.createOffice(dto, {
      ip: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
      userId: this.getUserId(req),
    });
  }

  @Get()
  getOffices() {
    return this.officeService.getOffices();
  }

  @Get(':id')
  getOfficeById(@Param('id') id: string) {
    return this.officeService.getOfficeById(id);
  }

  @Patch(':id')
  updateOffice(
    @Param('id') id: string,
    @Body() dto: UpdateOfficeDto,
    @Req() req: Request,
  ) {
    return this.officeService.updateOffice(id, dto, {
      ip: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
      userId: this.getUserId(req),
    });
  }

  @Delete(':id')
  deleteOffice(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.officeService.deleteOffice(id, {
      ip: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
      userId: this.getUserId(req),
    });
  }

  private getUserId(req: Request): string | null {
    const user = req.user as { id?: string } | undefined;

    return user?.id ?? null;
  }
}