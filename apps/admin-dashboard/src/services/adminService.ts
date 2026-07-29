import { trpc } from "@/lib/trpc";

export type AdminStatus = "INVITED" | "ACTIVE" | "REVOKED";
export type AdminRole = "ROOT_SUPERADMIN" | "ADMIN";

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  appointedBy?: { fullName: string } | null;
  appointedByName?: string | null;
  createdAt: string;
  inviteToken?: string | null;
}

/**
 * Admin service — all operations go through the tRPC `admin` router.
 *
 * Responses are normalized so that pages can continue using `admin.id`
 * instead of the Prisma field name `superadminId`.
 */
export const adminService = {
  getAdmins: async (): Promise<AdminUser[]> => {
    const data = await trpc.admin.list.query();
    return (data as any[]).map((a) => ({
      id: a.superadminId,
      fullName: a.fullName,
      email: a.email,
      role: a.role as AdminRole,
      status: a.status as AdminStatus,
      appointedBy: a.appointedBy ?? null,
      appointedByName: a.appointedByName ?? null,
      createdAt: a.createdAt,
    }));
  },

  inviteAdmin: async (data: {
    email: string;
    fullName: string;
    role: string;
  }): Promise<AdminUser & { inviteToken?: string }> => {
    const result = await trpc.admin.invite.mutate(data);
    const r = result as any;
    return {
      id: r.superadminId,
      fullName: r.fullName,
      email: r.email,
      role: r.role as AdminRole,
      status: r.status as AdminStatus,
      appointedByName: r.appointedByName ?? null,
      createdAt: r.createdAt ?? new Date().toISOString(),
      inviteToken: r.inviteToken,
    };
  },

  acceptInvite: async (data: {
    token: string;
    password: string;
  }): Promise<any> => {
    return trpc.admin.acceptInvite.mutate(data);
  },

  rejectInvite: async (data: { token: string }): Promise<any> => {
    return trpc.admin.rejectInvite.mutate(data);
  },

  deleteAdmin: async (id: string): Promise<any> => {
    return trpc.admin.delete.mutate({ id });
  },

  resendInvite: async (id: string): Promise<any> => {
    return trpc.admin.resendInvite.mutate({ id });
  },

  updateAdmin: async (
    id: string,
    data: { fullName?: string; password?: string }
  ): Promise<any> => {
    return trpc.admin.update.mutate({ id, ...data });
  },
};
