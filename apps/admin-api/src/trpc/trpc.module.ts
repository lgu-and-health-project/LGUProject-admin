import { Module } from '@nestjs/common';
import { TrpcService } from './trpc.service';
import { TrpcAppRouter } from './trpc.router';
import { AdminRouter } from './routers/admin.router';
import { TenantRouter } from './routers/tenant.router';
import { AuditLogRouter } from './routers/audit-log.router';
import { AdminsModule } from '../admins/admins.module';
import { TenantsModule } from '../tenants/tenants.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AdminsModule, TenantsModule, AuditLogsModule],
  providers: [
    TrpcService,
    TrpcAppRouter,
    AdminRouter,
    TenantRouter,
    AuditLogRouter,
  ],
  exports: [TrpcService, TrpcAppRouter],
})
export class TrpcModule {}
