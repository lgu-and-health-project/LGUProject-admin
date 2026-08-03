import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../trpc.service';
import { PrismaService } from '../../prisma/prisma.service';

function getDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000;
}

@Injectable()
export class AttendanceRouter {
  constructor(
    private trpc: TrpcService,
    private prisma: PrismaService,
  ) {}

  get router() {
    return this.trpc.router({
      clockIn: this.trpc.protectedProcedure
        .input(
          z.object({
            latitude: z.number(),
            longitude: z.number(),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          const org = await this.prisma.organization.findFirst();

          if (!org || org.geofenceLat === null || org.geofenceLng === null) {
            throw new Error('Geofencing is not configured for this LGU.');
          }

          const distance = getDistanceInMeters(
            org.geofenceLat,
            org.geofenceLng,
            input.latitude,
            input.longitude,
          );

          const radius = org.geofenceRadius || 50;

          if (distance > radius) {
            throw new Error(
              `You are too far from the office. Distance: ${Math.round(distance)}m, Allowed: ${radius}m.`,
            );
          }

          const log = await this.prisma.attendanceLog.create({
            data: {
              staffUserId: ctx.user.userId,
              status: 'online',
              latitude: input.latitude,
              longitude: input.longitude,
            },
          });

          return { success: true, distance: Math.round(distance), log };
        }),
    });
  }
}
