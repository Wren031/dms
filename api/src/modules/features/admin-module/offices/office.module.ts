import { Module } from '@nestjs/common';

import { PrismaModule } from 'src/prisma/prisma.module';
import { AuditModule } from 'src/modules/audit-module/audit.module';
import { OfficeService } from './office.service';
import { OfficeController } from './office.contoller';

@Module({
    imports: [PrismaModule, AuditModule],
    controllers: [OfficeController],
    providers: [OfficeService],
    exports: [OfficeService],
})
export class OfficeModule {}