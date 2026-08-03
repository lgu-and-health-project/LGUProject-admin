export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001/graphql";

export async function fetchGraphQL<T = any>(query: string, variables: any = {}): Promise<T> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const json = await response.json();
  if (json.errors) {
    console.error("GraphQL errors:", json.errors);
    throw new Error(json.errors[0].message || "GraphQL Error");
  }

  return json.data;
}

export const REST_API_URL = process.env.NEXT_PUBLIC_REST_API_URL || "http://localhost:4001";

export async function fetchRest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${REST_API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include", // needed if JWT is in cookie
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json.message || `HTTP Error ${response.status}`);
  }

  return json;
}
