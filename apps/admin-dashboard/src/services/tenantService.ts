import { trpc } from "@/lib/trpc";

export interface Tenant {
  id: string;
  psgcCode: string;
  name: string;
  level: string;
  status: string;
  registrationKey?: string;
  sysadminEmail?: string;
  createdAt: string;
}

/**
 * Tenant service — all operations go through the tRPC `tenant` router.
 *
 * Responses are normalized so that pages can continue using the flat
 * Tenant interface (e.g. `tenant.id`, `tenant.name`) instead of the
 * nested Prisma shape (`tenant.tenantId`, `tenant.psgcLocation.areaName`).
 */
function mapTenant(raw: any): Tenant {
  return {
    id: raw.tenantId,
    psgcCode: raw.psgcLocation?.code ?? "",
    name: raw.psgcLocation?.areaName ?? "",
    level: raw.psgcLocation?.level ?? "",
    status: raw.status,
    registrationKey: raw.registrationKey ?? raw.licenses?.[0]?.registrationKey,
    sysadminEmail: raw.sysadminEmail ?? "",
    createdAt: raw.createdAt,
  };
}

export const tenantService = {
  getTenants: async (): Promise<Tenant[]> => {
    const data = await trpc.tenant.list.query();
    return (data as any[]).map(mapTenant);
  },

  createTenant: async (input: {
    psgcCode: string;
    sysadminEmail: string;
  }): Promise<Tenant> => {
    const result = await trpc.tenant.create.mutate(input);
    return mapTenant(result);
  },

  suspendTenant: async (id: string): Promise<any> => {
    return trpc.tenant.suspend.mutate({ id });
  },

  activateTenant: async (id: string): Promise<any> => {
    return trpc.tenant.activate.mutate({ id });
  },

  deleteTenant: async (id: string): Promise<any> => {
    return trpc.tenant.delete.mutate({ id });
  },
};
