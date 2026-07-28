import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../trpc.service';
import { TenantsService } from '../../tenants/tenants.service';

@Injectable()
export class TenantRouter {
  constructor(
    private trpc: TrpcService,
    private tenantsService: TenantsService,
  ) {}

  get router() {
    return this.trpc.router({
      list: this.trpc.protectedProcedure.query(() => {
        return this.tenantsService.findAll();
      }),

      create: this.trpc.protectedProcedure
        .input(
          z.object({
            psgcCode: z.string().min(1),
            sysadminEmail: z.string().email(),
          }),
        )
        .mutation(({ input, ctx }) => {
          return this.tenantsService.createTenant(input, ctx.user);
        }),

      suspend: this.trpc.rootOnlyProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(({ input, ctx }) => {
          return this.tenantsService.suspendTenant(input.id, ctx.user);
        }),

      activate: this.trpc.rootOnlyProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(({ input, ctx }) => {
          return this.tenantsService.activateTenant(input.id, ctx.user);
        }),

      delete: this.trpc.rootOnlyProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(({ input, ctx }) => {
          return this.tenantsService.deleteTenant(input.id, ctx.user);
        }),
    });
  }
}
