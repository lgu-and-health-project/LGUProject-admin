import { createTRPCClient, httpBatchLink } from "@trpc/client";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";

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
    // Basic redirect for unauthorized
    if (!window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }
  }

  return response;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc: any = createTRPCClient<any>({
  links: [
    httpBatchLink({
      url: `${BASE_URL}/trpc`,
      fetch: authFetch,
    }),
  ],
});
