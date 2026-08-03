import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ConfigService } from '@nestjs/config';
import { sendPlatformEmail } from '../utils/gmail';
import { getSysadminEmailTemplate } from '../templates/mails/sysadmin.template';
import * as crypto from 'crypto';
import { DeviceStatus, LicenseStatus, AuditAction, AuditTargetType } from '@prisma/client';

@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly configService: ConfigService,
  ) {}

  async createDevice(hardwareSerial: string, actorId: string) {
    const existing = await this.prisma.devices.findUnique({
      where: { hardwareSerial },
    });
    if (existing) {
      throw new ConflictException('Device with this hardware serial already exists');
    }

    const device = await this.prisma.devices.create({
      data: {
        hardwareSerial,
        status: DeviceStatus.PROVISIONED,
      },
    });

    await this.auditLogsService.logAction({
      actorId,
      action: AuditAction.provision_device,
      targetType: AuditTargetType.device,
      targetId: device.deviceId,
      metadata: { hardwareSerial },
    });

    return device;
  }

  async bindDevice(deviceId: string, tenantId: string, actorId: string) {
    const device = await this.prisma.devices.findUnique({ where: { deviceId } });
    if (!device) throw new NotFoundException('Device not found');
    if (device.tenantId) throw new ConflictException('Device is already bound to a tenant');

    const tenant = await this.prisma.lguTenants.findUnique({
      where: { tenantId },
      include: { psgcLocation: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const registrationKey = crypto.randomUUID();

    const updatedDevice = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.devices.update({
        where: { deviceId },
        data: {
          tenantId,
          status: DeviceStatus.ASSIGNED,
          assignedAt: new Date(),
        },
      });

      await tx.licenses.create({
        data: {
          tenantId,
          deviceId,
          registrationKey,
          issuedAt: new Date(),
          status: LicenseStatus.active,
        },
      });

      return updated;
    });

    await this.auditLogsService.logAction({
      actorId,
      action: AuditAction.bind_device,
      targetType: AuditTargetType.device,
      targetId: device.deviceId,
      metadata: { hardwareSerial: device.hardwareSerial, tenantId },
    });

    // Send email to sysadmin with registration key
    try {
      await sendPlatformEmail(this.configService, {
        to: tenant.sysadminEmail,
        subject: 'Your LGU System Device Registration Key',
        text: `Your device has been bound. Your registration key is ${registrationKey}.`,
        html: getSysadminEmailTemplate({
          registrationKey,
          organizationName: tenant.psgcLocation.areaName,
        }),
      });
    } catch (e) {
      console.error('Failed to send registration email', e);
    }

    return updatedDevice;
  }

  async editHardwareSerial(deviceId: string, newHardwareSerial: string, actorId: string) {
    const device = await this.prisma.devices.findUnique({ where: { deviceId } });
    if (!device) throw new NotFoundException('Device not found');
    if (device.status !== DeviceStatus.PROVISIONED && device.status !== DeviceStatus.ASSIGNED) {
      throw new ForbiddenException('Cannot edit hardware serial for an active/suspended device');
    }

    const updated = await this.prisma.devices.update({
      where: { deviceId },
      data: { hardwareSerial: newHardwareSerial },
    });

    await this.auditLogsService.logAction({
      actorId,
      action: AuditAction.provision_device, // Using provision_device or similar as 'edit_serial' isn't in AuditAction
      targetType: AuditTargetType.device,
      targetId: device.deviceId,
      metadata: { oldSerial: device.hardwareSerial, newSerial: newHardwareSerial },
    });

    return updated;
  }

  async decommissionDevice(deviceId: string, actorId: string) {
    const device = await this.prisma.devices.findUnique({ where: { deviceId } });
    if (!device) throw new NotFoundException('Device not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      const dev = await tx.devices.update({
        where: { deviceId },
        data: {
          status: DeviceStatus.DECOMMISSIONED,
          decommissionedAt: new Date(),
        },
      });

      await tx.licenses.updateMany({
        where: { deviceId, status: LicenseStatus.active },
        data: {
          status: LicenseStatus.revoked,
          revokedAt: new Date(),
          revokedReason: 'Device decommissioned',
        },
      });

      return dev;
    });

    await this.auditLogsService.logAction({
      actorId,
      action: AuditAction.decommission_device,
      targetType: AuditTargetType.device,
      targetId: device.deviceId,
      metadata: { hardwareSerial: device.hardwareSerial },
    });

    return updated;
  }

  async replaceHardware(oldDeviceId: string, newHardwareSerial: string, actorId: string) {
    const oldDevice = await this.prisma.devices.findUnique({ where: { deviceId: oldDeviceId } });
    if (!oldDevice) throw new NotFoundException('Old device not found');
    if (!oldDevice.tenantId) throw new ConflictException('Old device is not bound to a tenant');

    await this.decommissionDevice(oldDeviceId, actorId);

    const newDevice = await this.createDevice(newHardwareSerial, actorId);
    return this.bindDevice(newDevice.deviceId, oldDevice.tenantId, actorId);
  }
}
