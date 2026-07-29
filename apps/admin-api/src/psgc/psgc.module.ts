import { Module } from '@nestjs/common';
import { PsgcService } from './psgc.service';
import { PsgcController } from './psgc.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [PsgcController],
  providers: [PsgcService],
  exports: [PsgcService],
})
export class PsgcModule {}
