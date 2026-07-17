import { fetchApi } from "./apiClient";

export interface LoginCredentials {
  email: string;
  password?: string;
}

export const authService = {
  login: (credentials: LoginCredentials) => {
    return fetchApi("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  logout: () => {
    return fetchApi("/auth/logout", {
      method: "POST",
    });
  },
};
