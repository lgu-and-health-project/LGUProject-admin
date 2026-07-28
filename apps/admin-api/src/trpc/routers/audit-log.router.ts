import { Injectable } from '@nestjs/common';
import { TrpcService } from '../trpc.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';

@Injectable()
export class AuditLogRouter {
  constructor(
    private trpc: TrpcService,
    private auditLogsService: AuditLogsService,
  ) {}

  get router() {
    return this.trpc.router({
      list: this.trpc.protectedProcedure.query(() => {
        return this.auditLogsService.findAll();
      }),
    });
  }
}
