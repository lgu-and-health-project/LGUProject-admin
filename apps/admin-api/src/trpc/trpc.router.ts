import { Injectable } from '@nestjs/common';
import { TrpcService } from './trpc.service';
import { AdminRouter } from './routers/admin.router';
import { TenantRouter } from './routers/tenant.router';
import { AuditLogRouter } from './routers/audit-log.router';
import { DeviceRouter } from './routers/device.router';

@Injectable()
export class TrpcAppRouter {
  constructor(
    private trpc: TrpcService,
    private adminRouter: AdminRouter,
    private tenantRouter: TenantRouter,
    private auditLogRouter: AuditLogRouter,
    private deviceRouter: DeviceRouter,
  ) {}

  get appRouter() {
    return this.trpc.router({
      admin: this.adminRouter.router,
      tenant: this.tenantRouter.router,
      auditLog: this.auditLogRouter.router,
      device: this.deviceRouter.router,
    });
  }
}

/** The merged tRPC router type — import this in admin-dashboard for the tRPC client. */
export type AppRouter = TrpcAppRouter['appRouter'];
