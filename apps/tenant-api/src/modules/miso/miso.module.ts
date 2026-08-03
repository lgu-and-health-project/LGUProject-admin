import { Module } from '@nestjs/common';
import { MisoController } from './miso.controller';
import { MisoService } from './miso.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [MisoController],
  providers: [MisoService, PrismaService],
})
export class MisoModule {}
