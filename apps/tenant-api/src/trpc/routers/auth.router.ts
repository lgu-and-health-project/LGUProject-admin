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

      login: this.trpc.publicProcedure
        .input(
          z.object({
            email: z.string().email(),
            password: z.string(),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          const res = await this.authService.login(
            input.email,
            input.password,
            ctx.reqIp,
            ctx.userAgent,
          );
          return { user: res.user, access_token: res.accessToken };
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
