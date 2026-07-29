import { trpc } from "@/lib/trpc";

export interface AuditLog {
  id: string;
  actor: {
    fullName: string;
    email: string;
    role: string;
  } | null;
  action: string;
  status: string;
  metadata: any;
  createdAt: string;
}

/**
 * Audit log service — reads from the tRPC `auditLog` router.
 */
export const auditService = {
  getAuditLogs: async (): Promise<AuditLog[]> => {
    const data = await trpc.auditLog.list.query();
    return (data as any[]).map((log) => ({
      id: log.adminAuditId,
      actor: log.actor ?? null,
      action: log.action,
      status: log.status,
      metadata: log.metadata,
      createdAt: log.createdAt,
    }));
  },
};
