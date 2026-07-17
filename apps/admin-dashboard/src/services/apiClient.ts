const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';


export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    credentials: "include", // REQUIRED for HttpOnly cookies
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorMessage = `API Error: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.message) errorMessage = errorData.message;
    } catch (e) {
      // Ignore if response is not JSON
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  // Some endpoints (like login/logout) might not return JSON, just a 200 OK.
  try {
    return await response.json() as T;
  } catch (e) {
    return {} as T;
  }
}
