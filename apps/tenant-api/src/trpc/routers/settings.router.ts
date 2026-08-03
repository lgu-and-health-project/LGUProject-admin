import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../trpc.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsRouter {
  constructor(private trpc: TrpcService, private prisma: PrismaService) {}

  get router() {
    return this.trpc.router({
      getGeofence: this.trpc.protectedProcedure.query(async () => {
        const org = await this.prisma.organization.findFirst();
        return {
          lat: org?.geofenceLat,
          lng: org?.geofenceLng,
          radius: org?.geofenceRadius,
        };
      }),

      updateGeofence: this.trpc.protectedProcedure
        .input(
          z.object({
            lat: z.number(),
            lng: z.number(),
            radius: z.number().min(10),
          })
        )
        .mutation(async ({ input }) => {
          const org = await this.prisma.organization.findFirst();
          if (!org) throw new Error('No organization found');
          
          return this.prisma.organization.update({
            where: { code: org.code },
            data: {
              geofenceLat: input.lat,
              geofenceLng: input.lng,
              geofenceRadius: input.radius,
            }
          });
        }),
    });
  }
}
