import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { StaffModule } from './modules/staff/staff.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminApiModule } from './modules/admin-api/admin-api.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { HrisModule } from './modules/hris/hris.module';
import { MisoModule } from './modules/miso/miso.module';
import { TrpcModule } from './trpc/trpc.module';
import { RelayAgentModule } from './modules/relay-agent/relay-agent.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    StaffModule,
    RbacModule,
    ScheduleModule.forRoot(),
    AdminApiModule,
    AnnouncementsModule,
    HrisModule,
    MisoModule,
    TrpcModule,
    RelayAgentModule,
  ],
  providers: [AppService],
})
export class AppModule {}
