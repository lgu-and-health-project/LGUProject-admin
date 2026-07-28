import { Module } from '@nestjs/common';
import { PsgcService } from './psgc.service';

@Module({
  providers: [PsgcService],
  exports: [PsgcService],
})
export class PsgcModule {}
