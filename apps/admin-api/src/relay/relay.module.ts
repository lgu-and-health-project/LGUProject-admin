import { Module } from '@nestjs/common';
import { RelayGateway } from './relay.gateway';
import { RelayController } from './relay.controller';

@Module({
  controllers: [RelayController],
  providers: [RelayGateway],
  exports: [RelayGateway],
})
export class RelayModule {}
