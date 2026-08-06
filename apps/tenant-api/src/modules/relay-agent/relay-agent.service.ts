import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class RelayAgentService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RelayAgentService.name);
  private socket: Socket | null = null;
  private adminApiUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.adminApiUrl =
      this.configService.get<string>('ADMIN_API_URL') ||
      'http://localhost:4000';
  }

  async onApplicationBootstrap() {
    this.logger.log('Initializing RelayAgentService...');
    
    // Read persistent credentials
    const registrationKeyConfig = await this.prisma.systemConfig.findUnique({
      where: { key: 'DEVICE_REGISTRATION_KEY' },
    });
    const deviceIdConfig = await this.prisma.systemConfig.findUnique({
      where: { key: 'DEVICE_ID' },
    });

    const registrationKey = registrationKeyConfig?.value;
    const deviceId = deviceIdConfig?.value;

    if (!registrationKey || !deviceId) {
      this.logger.warn(
        'Missing DEVICE_REGISTRATION_KEY or DEVICE_ID in SystemConfig. Skipping reverse tunnel initialization. Device is not paired yet.',
      );
      return;
    }

    this.logger.log(`Connecting to central relay at ${this.adminApiUrl}...`);
    
    // Connect to central WS gateway
    this.socket = io(this.adminApiUrl, {
      auth: {
        deviceId,
        registrationKey,
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      this.logger.log('Successfully connected to central relay.');
    });

    this.socket.on('disconnect', (reason) => {
      this.logger.warn(`Disconnected from central relay. Reason: ${reason}`);
    });

    this.socket.on('connect_error', (error) => {
      this.logger.error(`Connection error to central relay: ${error.message}`);
    });

    this.socket.on('relay_request', async (payload: any, ack: (response: any) => void) => {
      this.logger.debug(`Received relay request: ${JSON.stringify(payload)}`);
      try {
        // Forward to the local tRPC auth.login endpoint via HTTP
        const localPort = process.env.PORT || 4001;
        const targetUrl = `http://127.0.0.1:${localPort}/trpc/auth.login`;
        
        // Ensure relayLogId is forwarded inside the request body if needed
        const { relayLogId, ...loginPayload } = payload;
        
        const response = await firstValueFrom(
          this.httpService.post(targetUrl, loginPayload, {
            headers: {
              'Content-Type': 'application/json',
            }
          })
        );
        
        // Return successful response to central
        ack(response.data);
      } catch (error: any) {
        this.logger.error(`Local relay request failed: ${error.message}`);
        
        // Extract HTTP status if it's an Axios error
        const status = error.response?.status || 500;
        const errorData = error.response?.data || { message: error.message };
        
        ack({
          error: errorData,
          status,
        });
      }

    });
  }
}
