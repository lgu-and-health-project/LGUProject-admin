import { Module } from '@nestjs/common';
import { InternalTenantsController } from './internal-tenants.controller';
import { TenantsService } from './tenants.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PsgcModule } from '../psgc/psgc.module';

@Module({
  imports: [PrismaModule, AuditLogsModule, PsgcModule],
  controllers: [InternalTenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
