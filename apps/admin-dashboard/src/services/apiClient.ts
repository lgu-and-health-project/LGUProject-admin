const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      defaultHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      if (endpoint !== "/auth/refresh") {
        try {
          const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
            method: "POST",
            credentials: "include",
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            if (typeof window !== "undefined") {
              localStorage.setItem("access_token", refreshData.access_token);
            }

            // Retry the original request
            const newHeaders = {
              ...defaultHeaders,
              ...options.headers,
              Authorization: `Bearer ${refreshData.access_token}`,
            };
            const retryResponse = await fetch(url, {
              ...options,
              credentials: "include",
              headers: newHeaders,
            });

            if (retryResponse.ok) {
              if (retryResponse.status === 204) return {} as T;
              return await retryResponse.json() as T;
            }
          }
        } catch (e) {
          console.error("Token refresh failed", e);
        }
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
      }
    }

    let errorMessage = `API Error: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.message) errorMessage = errorData.message;
    } catch (e) {}
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    if (endpoint === "/auth/logout" && typeof window !== "undefined") {
      localStorage.removeItem("access_token");
    }
    return {} as T;
  }

  try {
    const data = await response.json();
    if (endpoint === "/auth/login" && data.access_token && typeof window !== "undefined") {
      localStorage.setItem("access_token", data.access_token);
    }
    if (endpoint === "/auth/logout" && typeof window !== "undefined") {
      localStorage.removeItem("access_token");
    }
    return data as T;
  } catch (e) {
    return {} as T;
  }
}
