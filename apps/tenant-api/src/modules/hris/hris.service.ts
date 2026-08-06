import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

@Injectable()
export class HrisService {
  private readonly hrisUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // Default to mock-backend port if not specified
    this.hrisUrl = this.configService.get<string>('HRIS_URL', 'http://localhost:4002');
  }

  // We don't have the JWT directly here unless we pass it, but for an internal API proxy 
  // we could just sign a new internal one, OR we can modify the controller to pass the token.
  // Wait, if tenant-api is the issuer, it can just generate a short-lived token or use a service account token.
  // Alternatively, we can pass the user ID in the body, but our HRIS expects a Bearer token now.
  // Let's generate a service token for the proxy.
  private get proxyToken(): string {
    // We can use the same JWT secret that mock-backend validates against
    const jwt = require('jsonwebtoken');
    const secret = this.configService.get<string>('JWT_SECRET', 'bae9b57c89d66c332c050b9db95414ae42d131d60bff9facfa3bf54ea1357ae9361fe6c748124d3c6bb601cc8efcc62b80835d350f21f7a2313f97b17aa3312f');
    return jwt.sign({ sub: 'proxy-service', role: 'admin' }, secret, { expiresIn: '1m' });
  }

  private get headers() {
    return { Authorization: `Bearer ${this.proxyToken}` };
  }

  async logAttendance(orgCode: string, staffId: string, dto: CreateAttendanceDto) {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(`${this.hrisUrl}/hris/attendance`, {
          employee_id: staffId,
          type: dto.type,
          latitude: dto.latitude,
          longitude: dto.longitude,
          captured_at: new Date().toISOString(),
        }, { headers: this.headers }),
      );
      return data;
    } catch (e) {
      throw new InternalServerErrorException(e.message);
    }
  }

  async getStaffAttendance(orgCode: string, staffId: string) {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.hrisUrl}/hris/attendance/me`, { headers: this.headers }),
      );
      // Filter for staffId if mock-backend doesn't do it right
      return Array.isArray(data) ? data.filter(d => d.staffId === staffId) : data;
    } catch (e) {
      throw new InternalServerErrorException(e.message);
    }
  }

  async getAllAttendance(orgCode: string) {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.hrisUrl}/hris/attendance`, { headers: this.headers }),
      );
      return data;
    } catch (e) {
      throw new InternalServerErrorException(e.message);
    }
  }

  async getMyLeaveRequests(orgCode: string, staffId: string) {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.hrisUrl}/hris/leave-requests/me`, { headers: this.headers }),
      );
      return Array.isArray(data) ? data.filter(d => d.staffId === staffId) : data;
    } catch (e) {
      throw new InternalServerErrorException(e.message);
    }
  }

  async createLeaveRequest(
    orgCode: string,
    staffId: string,
    type: string,
    startDate: Date,
    endDate: Date,
    reason: string,
  ) {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(`${this.hrisUrl}/hris/leave-requests`, {
          employee_id: staffId,
          type,
          date_from: startDate.toISOString(),
          date_to: endDate.toISOString(),
          reason,
        }, { headers: this.headers }),
      );
      return data;
    } catch (e) {
      throw new InternalServerErrorException(e.message);
    }
  }

  async getMyPayroll(orgCode: string, staffId: string) {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.hrisUrl}/hris/payroll/me`, { headers: this.headers }),
      );
      return Array.isArray(data) ? data.filter(d => d.staffId === staffId) : data;
    } catch (e) {
      throw new InternalServerErrorException(e.message);
    }
  }
}
