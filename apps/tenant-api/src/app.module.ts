import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { StaffModule } from './modules/staff/staff.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminApiModule } from './modules/admin-api/admin-api.module';
import { RbacModule } from './modules/rbac/rbac.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    StaffModule,
    RbacModule,
    ScheduleModule.forRoot(),
    AdminApiModule,
  ],
  providers: [AppService],
})
export class AppModule {}
