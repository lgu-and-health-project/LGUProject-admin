import { CurrentUser, ModulePermission } from "@/services/auth";
import { ADMIN_MODULES, LGU_MODULES, ModuleTab } from "@/lib/config/modules";

type Action = "create" | "read" | "update" | "delete";

/**
 * The ONLY permission check in the app. Reads exclusively from
 * user.permissions, which comes from the tenant-api `me` query — which in
 * turn reads real RolePermission rows. There is no client-side fallback
 * permission table anymore (lib/rbac.ts was deleted): if the backend says
 * no, the frontend has nothing to override that with.
 */
export function hasAccess(
  user: CurrentUser | null | undefined,
  moduleId: string,
  action: Action = "read",
): boolean {
  if (!user) return false;
  const perm = user.permissions.find((p) => p.module === moduleId);
  if (!perm) return false;
  return perm[action];
}

export function getAccessibleModules(
  user: CurrentUser | null | undefined,
  category: "admin" | "lgu",
  action: Action = "read",
): ModuleTab[] {
  const source = category === "admin" ? ADMIN_MODULES : LGU_MODULES;
  return source.filter((m) => hasAccess(user, m.id, action));
}

export function getPermission(
  user: CurrentUser | null | undefined,
  moduleId: string,
): ModulePermission | undefined {
  return user?.permissions.find((p) => p.module === moduleId);
}
