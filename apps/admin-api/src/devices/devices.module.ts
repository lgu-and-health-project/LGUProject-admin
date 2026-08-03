import { Module } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

import { DevicesController } from './devices.controller';

@Module({
  imports: [AuditLogsModule],
  controllers: [DevicesController],
  providers: [DevicesService, PrismaService],
  exports: [DevicesService],
})
export class DevicesModule {}
