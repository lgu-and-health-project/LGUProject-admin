import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { RelayGateway } from './relay.gateway';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Controller('relay')
export class RelayController {
  constructor(
    private readonly relayGateway: RelayGateway,
    private readonly prisma: PrismaService,
  ) {}

  @Post('auth/login')
  async loginRelay(@Body() body: any) {
    const { orgCode, psgcCode, employeeCode, password } = body;
    const lookupCode = orgCode || psgcCode;

    if (!lookupCode) {
      throw new HttpException('Missing orgCode or psgcCode', HttpStatus.BAD_REQUEST);
    }

    // 1. Find tenant
    const tenant = await this.prisma.lguTenants.findFirst({
      where: {
        psgcLocation: { code: lookupCode },
        status: 'active'
      },
      include: {
        devices: true
      }
    });

    if (!tenant) {
      await this.prisma.relayConnectionLogs.create({
        data: {
          outcome: 'TENANT_NOT_FOUND',
        },
      });
      throw new HttpException(
        { error: 'TENANT_NOT_FOUND', message: 'The specified municipality could not be found or is inactive.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // 2. Find reachable device
    const device = tenant.devices.find((d) => d.agentReachable && d.status === 'ACTIVE');
    const relayLogId = crypto.randomUUID();

    if (!device) {
      await this.prisma.relayConnectionLogs.create({
        data: {
          relayLogId,
          tenantId: tenant.tenantId,
          outcome: 'TENANT_UNREACHABLE',
        },
      });
      throw new HttpException(
        { error: 'TENANT_UNREACHABLE', message: 'The municipal server is currently offline or unreachable.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // 3. Get socket
    const socket = this.relayGateway.getSocketForTenant(tenant.tenantId);
    if (!socket) {
      await this.prisma.relayConnectionLogs.create({
        data: {
          relayLogId,
          tenantId: tenant.tenantId,
          deviceId: device.deviceId,
          outcome: 'TENANT_UNREACHABLE',
        },
      });
      throw new HttpException(
        { error: 'TENANT_UNREACHABLE', message: 'The municipal server is currently offline or unreachable.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // 4. Relay request
    try {
      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('TIMEOUT'));
        }, 5000);

        socket.emit('relay_request', { ...body, relayLogId }, (ack: any) => {
          clearTimeout(timeout);
          resolve(ack);
        });
      });

      // Forwarded successfully
      await this.prisma.relayConnectionLogs.create({
        data: {
          relayLogId,
          tenantId: tenant.tenantId,
          deviceId: device.deviceId,
          outcome: 'ROUTED',
        },
      });

      const ackResponse = response as any;
      
      // If the tenant returned an HTTP error explicitly wrapped in the ack
      if (ackResponse && ackResponse.error) {
         throw new HttpException(ackResponse.error, ackResponse.status || HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return ackResponse;
    } catch (error: any) {
      if (error.message === 'TIMEOUT') {
        await this.prisma.relayConnectionLogs.create({
          data: {
            relayLogId,
            tenantId: tenant.tenantId,
            deviceId: device.deviceId,
            outcome: 'TENANT_TIMEOUT',
          },
        });
        throw new HttpException(
          { error: 'TENANT_TIMEOUT', message: 'The municipal server did not respond in time.' },
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }
      throw error;
    }
  }
}
