import { fetchApi } from "./apiClient";

export type AdminStatus = "PENDING_APPROVAL" | "INVITED" | "ACTIVE" | "REJECTED" | "SUSPENDED";
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
}

export const adminService = {
  getAdmins: async (): Promise<AdminUser[]> => {
    return fetchApi("/admins", {
      method: "GET",
    });
  },

  inviteAdmin: async (data: { email: string; fullName: string; role: string }): Promise<AdminUser> => {
    return fetchApi("/admins/invite", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  acceptInvite: async (data: { token: string; password: string }): Promise<any> => {
    return fetchApi("/admins/accept-invite", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  rejectInvite: async (data: { token: string }): Promise<any> => {
    return fetchApi("/admins/reject-invite", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  deleteAdmin: async (id: string): Promise<any> => {
    return fetchApi(`/admins/${id}`, {
      method: "DELETE",
    });
  },
};
