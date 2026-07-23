import { LGU_MODULES, ADMIN_MODULES } from "./modules";

export interface CrudPermissions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export interface RoleAccess {
  role: string;
  allowedModules: string[]; // Array of module IDs
  permissions: Record<string, CrudPermissions>; // Module ID -> Permissions
}

const FULL_CRUD: CrudPermissions = { create: true, read: true, update: true, delete: true };

// Sysadmin gets full access to everything
const sysadminModules = [...ADMIN_MODULES.map(m => m.id), ...LGU_MODULES.map(m => m.id)];
const sysadminPermissions: Record<string, CrudPermissions> = {};

sysadminModules.forEach(id => {
  sysadminPermissions[id] = FULL_CRUD;
});

export const RBAC_DEFINITIONS: Record<string, RoleAccess> = {
  sysadmin: {
    role: "sysadmin",
    allowedModules: sysadminModules,
    permissions: sysadminPermissions,
  },
};

export const getRoleAccess = (role: string | null | undefined): RoleAccess | null => {
  if (!role) return null;
  // Use a fallback for sysadmin if it matches, otherwise null for now
  return RBAC_DEFINITIONS[role.toLowerCase()] || null;
};
