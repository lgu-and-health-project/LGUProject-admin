import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AdminApiService } from './admin-api.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [HttpModule],
  providers: [AdminApiService, PrismaService],
  exports: [AdminApiService],
})
export class AdminApiModule {}
