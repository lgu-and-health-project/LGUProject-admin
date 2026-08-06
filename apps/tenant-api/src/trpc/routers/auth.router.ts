import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../trpc.service';
import { AuthService } from '../../modules/auth/auth.service';

@Injectable()
export class AuthRouter {
  private readonly logger = new Logger(AuthRouter.name);

  constructor(
    private trpc: TrpcService,
    private authService: AuthService,
  ) {}

  get router() {
    return this.trpc.router({
      me: this.trpc.protectedProcedure.query(({ ctx }) => {
        return { user: ctx.user };
      }),

      status: this.trpc.publicProcedure.query(async () => {
        return this.authService.getServerStatus();
      }),

      login: this.trpc.publicProcedure
        .input(
          z.object({
            orgCode: z.string(),
            employeeCode: z.string(),
            password: z.string(),
            relayLogId: z.string().optional(),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          const res = await this.authService.login(
            input.orgCode,
            input.employeeCode,
            input.password,
            ctx.reqIp,
            ctx.userAgent,
            input.relayLogId,
          );
          return { user: res.user, access_token: res.accessToken, refresh_token: res.refreshToken };
        }),

      setInitialPassword: this.trpc.publicProcedure
        .input(
          z.object({
            orgCode: z.string(),
            employeeCode: z.string(),
            password: z.string(),
            relayLogId: z.string().optional(),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          await this.authService.setInitialPassword(
            input.orgCode,
            input.employeeCode,
            input.password,
            ctx.reqIp,
            ctx.userAgent,
            input.relayLogId,
          );
          return { success: true };
        }),

      onboard: this.trpc.publicProcedure
        .input(
          z.object({
            registrationKey: z.string().optional().default(''),
            email: z.string().email(),
            password: z.string(),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          const res = await this.authService.onboard(
            input.registrationKey,
            input.email,
            input.password,
            ctx.reqIp,
            ctx.userAgent,
          );
          return { user: res.user, access_token: res.accessToken, refresh_token: res.refreshToken };
        }),

      refresh: this.trpc.publicProcedure
        .input(
          z.object({
            refreshToken: z.string(),
          }),
        )
        .mutation(async ({ input }) => {
          const res = await this.authService.refreshSession(input.refreshToken);
          return { user: res.user, access_token: res.accessToken };
        }),

      pair: this.trpc.publicProcedure
        .input(
          z.object({
            pairingToken: z.string().length(6),
          }),
        )
        .mutation(async ({ input }) => {
          this.logger.log(`[TRPC] auth.pair called with input: ${JSON.stringify(input)}`);
          return this.authService.pairDevice(input.pairingToken);
        }),
    });
  }
}
