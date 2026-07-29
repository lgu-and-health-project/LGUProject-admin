import { createTRPCClient, httpBatchLink } from "@trpc/client";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Custom fetch wrapper that:
 * 1. Injects the JWT access_token from localStorage
 * 2. On 401, attempts a silent token refresh via /auth/refresh
 * 3. If refresh fails, clears token and redirects to /login
 *
 * This mirrors the auth retry logic from apiClient.ts so tRPC calls
 * behave identically to legacy REST calls.
 */
async function authFetch(
  url: RequestInfo | URL,
  options?: RequestInit
): Promise<Response> {
  const headers = new Headers(options?.headers);

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 401 && typeof window !== "undefined") {
    try {
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        localStorage.setItem("access_token", data.access_token);
        headers.set("Authorization", `Bearer ${data.access_token}`);
        response = await fetch(url, {
          ...options,
          headers,
          credentials: "include",
        });
      }
    } catch {
      // refresh failed — fall through to redirect
    }

    if (response.status === 401) {
      localStorage.removeItem("access_token");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
  }

  return response;
}

/**
 * Vanilla tRPC client connected to the admin-api at /trpc.
 *
 * Type safety note: We use `any` for the AppRouter type to avoid
 * cross-project type dependency issues in the monorepo. The service
 * layer (adminService, tenantService, etc.) adds its own typed
 * interfaces on top of the raw tRPC responses.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc: any = createTRPCClient<any>({
  links: [
    httpBatchLink({
      url: `${BASE_URL}/trpc`,
      fetch: authFetch,
    }),
  ],
});
