import { Injectable } from '@nestjs/common';
import { TrpcService } from './trpc.service';
import { AuthRouter } from './routers/auth.router';

@Injectable()
export class TrpcAppRouter {
  constructor(
    private trpc: TrpcService,
    private authRouter: AuthRouter,
  ) {}

  get appRouter() {
    return this.trpc.router({
      auth: this.authRouter.router,
    });
  }
}

export type AppRouter = TrpcAppRouter['appRouter'];
