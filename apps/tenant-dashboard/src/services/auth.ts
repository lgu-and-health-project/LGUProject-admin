import { fetchGraphQL } from "./apiClient";

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
    const query = `
      mutation Login($input: LoginInput!) {
        login(input: $input) {
          user {
            userId
            email
            role
            roleId
            orgCode
            departmentId
            permissions {
              module
              create
              read
              update
              delete
            }
            org {
              name
              level
            }
          }
        }
      }
    `;
    const variables = { input: { email, password } };
    const data = await fetchGraphQL<{ login: { user: CurrentUser } }>(query, variables);
    return data.login.user;
  },

  getUser: async (): Promise<CurrentUser | null> => {
    try {
      const query = `
        query {
          me {
            user {
              userId
              email
              role
              roleId
              orgCode
              departmentId
              permissions {
                module
                create
                read
                update
                delete
              }
              org {
                name
                level
              }
            }
          }
        }
      `;
      const data = await fetchGraphQL<{ me: { user: CurrentUser } }>(query);
      return data.me.user;
    } catch (e) {
      console.error("Failed to fetch user:", e);
      return null;
    }
  },
  
  logout: async (): Promise<void> => {
    // Add logout mutation if needed, or clear session cookie
    // Since session cookie is HTTP-only, logout requires backend call
    const query = `
      mutation {
        logout {
          success
        }
      }
    `;
    try {
      await fetchGraphQL(query);
    } catch (e) {
      console.warn("Logout error:", e);
    }
  }
};
