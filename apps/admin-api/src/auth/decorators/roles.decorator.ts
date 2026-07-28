import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to specific SuperAdmin roles.
 * Must be combined with JwtAuthGuard + RolesGuard.
 *
 * Example:
 *   @Roles(AdminRole.ROOT_SUPERADMIN)
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Delete(':id')
 */
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);
