import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../trpc.service';
import { DevicesService } from '../../devices/devices.service';

@Injectable()
export class DeviceRouter {
  constructor(
    private trpc: TrpcService,
    private devicesService: DevicesService,
  ) {}

  get router() {
    return this.trpc.router({
      provision: this.trpc.protectedProcedure
        .input(z.object({ hardwareSerial: z.string().min(1) }))
        .mutation(({ input, ctx }) => {
          return this.devicesService.createDevice(input.hardwareSerial, ctx.user.sub);
        }),

      bind: this.trpc.protectedProcedure
        .input(z.object({ deviceId: z.string().uuid(), tenantId: z.string().uuid() }))
        .mutation(({ input, ctx }) => {
          return this.devicesService.bindDevice(input.deviceId, input.tenantId, ctx.user.sub);
        }),

      decommission: this.trpc.protectedProcedure
        .input(z.object({ deviceId: z.string().uuid() }))
        .mutation(({ input, ctx }) => {
          return this.devicesService.decommissionDevice(input.deviceId, ctx.user.sub);
        }),

      replace: this.trpc.protectedProcedure
        .input(z.object({ oldDeviceId: z.string().uuid(), newHardwareSerial: z.string().min(1) }))
        .mutation(({ input, ctx }) => {
          return this.devicesService.replaceHardware(input.oldDeviceId, input.newHardwareSerial, ctx.user.sub);
        }),

      editSerial: this.trpc.protectedProcedure
        .input(z.object({ deviceId: z.string().uuid(), newHardwareSerial: z.string().min(1) }))
        .mutation(({ input, ctx }) => {
          return this.devicesService.editHardwareSerial(input.deviceId, input.newHardwareSerial, ctx.user.sub);
        }),
    });
  }
}
