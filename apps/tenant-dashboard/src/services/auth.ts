import { trpc } from "../lib/trpc";

export interface ModulePermission {
  module: string;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export interface CurrentUser {
  userId: string;
  email: string;
  role: string | null;
  roleId: string | null;
  orgCode: string;
  departmentId: string | null;
  permissions: ModulePermission[];
  org?: {
    name: string;
    level: string;
  };
}

export const authService = {
  login: async (email: string, password: string): Promise<CurrentUser> => {
    const res = await trpc.auth.login.mutate({ email, password });
    if (res.access_token) {
      localStorage.setItem("access_token", res.access_token);
    }
    return res.user;
  },

  getUser: async (): Promise<CurrentUser | null> => {
    try {
      const res = await trpc.auth.me.query();
      return res.user;
    } catch (e) {
      console.error("Failed to fetch user:", e);
      return null;
    }
  },
  
  logout: async (): Promise<void> => {
    try {
      localStorage.removeItem("access_token");
      // Add backend logout call here if implemented in trpc router later
    } catch (e) {
      console.warn("Logout error:", e);
    }
  }
};
