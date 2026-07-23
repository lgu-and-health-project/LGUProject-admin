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
