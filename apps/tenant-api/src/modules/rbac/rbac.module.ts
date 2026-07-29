import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RbacService } from './rbac.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [AuthModule],
  providers: [RbacService, PrismaService],
})
export class RbacModule {}
