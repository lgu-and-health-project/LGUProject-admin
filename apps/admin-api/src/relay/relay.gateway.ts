import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Logger, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RelayGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RelayGateway.name);

  // Map of tenantId -> Socket
  private readonly activeSockets = new Map<string, Socket>();

  constructor(private readonly prisma: PrismaService) {}

  async handleConnection(client: Socket) {
    const { deviceId, registrationKey } = client.handshake.auth;

    if (!deviceId || !registrationKey) {
      this.logger.warn(`Connection rejected: Missing auth fields`);
      client.disconnect(true);
      return;
    }

    // Authenticate the device
    const license = await this.prisma.licenses.findUnique({
      where: { registrationKey },
      include: { tenant: true },
    });

    if (!license || license.deviceId !== deviceId || license.status !== 'active') {
      this.logger.warn(`Connection rejected: Invalid credentials for device ${deviceId}`);
      client.disconnect(true);
      return;
    }

    const tenantId = license.tenantId;
    this.logger.log(`Device ${deviceId} (Tenant ${tenantId}) connected.`);

    // Store the socket
    this.activeSockets.set(tenantId, client);

    // Update Devices table
    await this.prisma.devices.update({
      where: { deviceId },
      data: {
        agentReachable: true,
        lastHeartbeatAt: new Date(),
      },
    });

    client.data = { tenantId, deviceId };
  }

  async handleDisconnect(client: Socket) {
    const tenantId = client.data?.tenantId;
    const deviceId = client.data?.deviceId;

    if (tenantId) {
      this.activeSockets.delete(tenantId);
      this.logger.log(`Device ${deviceId} (Tenant ${tenantId}) disconnected.`);

      // Update Devices table
      await this.prisma.devices.update({
        where: { deviceId },
        data: {
          agentReachable: false,
        },
      });
    }
  }

  // Called periodically by the client or simply relies on socket.io's ping/pong
  // but if the client explicitly sends a heartbeat:
  @SubscribeMessage('heartbeat')
  async handleHeartbeat(client: Socket) {
    const deviceId = client.data?.deviceId;
    if (deviceId) {
      await this.prisma.devices.update({
        where: { deviceId },
        data: { lastHeartbeatAt: new Date() },
      });
    }
    return { ok: true };
  }

  public getSocketForTenant(tenantId: string): Socket | undefined {
    return this.activeSockets.get(tenantId);
  }
}
