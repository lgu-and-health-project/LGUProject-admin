import { AdminRole } from '@prisma/client';
import type { Request } from 'express';

/** Shape of the signed JWT payload, and what request['user'] carries after JwtAuthGuard. */
export interface JwtPayload {
  sub: string; // SuperAdmins.superadminId
  email: string;
  role: AdminRole;
}

/** Request augmented with the authenticated admin, set by JwtAuthGuard. */
export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
