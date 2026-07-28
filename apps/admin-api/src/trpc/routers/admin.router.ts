import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AdminRole } from '@prisma/client';
import { TrpcService } from '../trpc.service';
import { AdminsService } from '../../admins/admins.service';

@Injectable()
export class AdminRouter {
  constructor(
    private trpc: TrpcService,
    private adminsService: AdminsService,
  ) {}

  get router() {
    return this.trpc.router({
      list: this.trpc.protectedProcedure.query(() => {
        return this.adminsService.findAll();
      }),

      invite: this.trpc.rootOnlyProcedure
        .input(
          z.object({
            email: z.string().email(),
            fullName: z.string().min(1),
            role: z.nativeEnum(AdminRole).optional(),
          }),
        )
        .mutation(({ input, ctx }) => {
          return this.adminsService.inviteAdmin(input, ctx.user);
        }),

      acceptInvite: this.trpc.publicProcedure
        .input(
          z.object({
            token: z.string(),
            password: z
              .string()
              .min(8, 'Password must be at least 8 characters'),
          }),
        )
        .mutation(({ input }) => {
          return this.adminsService.acceptInvite(input);
        }),

      rejectInvite: this.trpc.publicProcedure
        .input(z.object({ token: z.string() }))
        .mutation(({ input }) => {
          return this.adminsService.rejectInvite(input);
        }),

      delete: this.trpc.rootOnlyProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(({ input, ctx }) => {
          return this.adminsService.deleteAdmin(input.id, ctx.user);
        }),

      resendInvite: this.trpc.rootOnlyProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(({ input, ctx }) => {
          return this.adminsService.resendInvite(input.id, ctx.user);
        }),

      update: this.trpc.protectedProcedure
        .input(
          z.object({
            id: z.string().uuid(),
            fullName: z.string().min(1).optional(),
            password: z
              .string()
              .min(8, 'Password must be at least 8 characters')
              .optional(),
          }),
        )
        .mutation(({ input, ctx }) => {
          const { id, ...data } = input;
          return this.adminsService.updateAdmin(id, data, ctx.user);
        }),
    });
  }
}
