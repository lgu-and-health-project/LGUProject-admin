import { fetchRest } from "./apiClient";

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
    const data = await fetchRest<{ user: CurrentUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return data.user;
  },

  getUser: async (): Promise<CurrentUser | null> => {
    try {
      const data = await fetchRest<{ user: CurrentUser }>("/auth/me");
      return data.user;
    } catch (e) {
      console.error("Failed to fetch user:", e);
      return null;
    }
  },
  
  logout: async (): Promise<void> => {
    try {
      // If we implement a backend logout route, we can call it here.
      // For now, since JWT is in cookie, we rely on clearing the cookie or a backend logout endpoint.
      await fetchRest("/auth/logout", { method: "POST" });
    } catch (e) {
      console.warn("Logout error:", e);
    }
  }
};
