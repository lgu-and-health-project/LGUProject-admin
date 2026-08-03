import { Injectable } from '@nestjs/common';
import { TrpcService } from './trpc.service';
import { AuthRouter } from './routers/auth.router';
import { AttendanceRouter } from './routers/attendance.router';
import { SettingsRouter } from './routers/settings.router';

@Injectable()
export class TrpcAppRouter {
  constructor(
    private trpc: TrpcService,
    private authRouter: AuthRouter,
    private attendanceRouter: AttendanceRouter,
    private settingsRouter: SettingsRouter,
  ) {}

  get appRouter() {
    return this.trpc.router({
      auth: this.authRouter.router,
      attendance: this.attendanceRouter.router,
      settings: this.settingsRouter.router,
    });
  }
}

export type AppRouter = TrpcAppRouter['appRouter'];
