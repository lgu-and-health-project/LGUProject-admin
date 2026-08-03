import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Licenses, Devices, LguTenants } from '@prisma/client';

export type DeviceAuthPayload = {
  license: Licenses;
  device: Devices;
  tenant: LguTenants;
};

export const DeviceAuth = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): DeviceAuthPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.deviceAuth;
  },
);
