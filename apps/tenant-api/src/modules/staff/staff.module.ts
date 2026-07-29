import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StaffService } from './staff.service';
import { StaffManagementService } from './staff-management.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [AuthModule],
  providers: [
    StaffService, 
    StaffManagementService, 
    PrismaService
  ],
})
export class StaffModule {}
