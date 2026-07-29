import { fetchGraphQL } from "./apiClient";

export interface RolePermission {
  id: string;
  module: string;
  divisionId: string | null;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface RoleSummary {
  id: string;
  roleName: string;
  isSystemDefault: boolean;
  staffCount: number;
  permissions: RolePermission[];
}

export interface ModuleInfo {
  id: string;
  label: string;
  category: string;
}

export const rolesService = {
  listRoles: async (): Promise<RoleSummary[]> => {
    const query = `
      query {
        roles {
          id
          roleName
          isSystemDefault
          staffCount
          permissions {
            id
            module
            divisionId
            canCreate
            canRead
            canUpdate
            canDelete
          }
        }
      }
    `;
    const data = await fetchGraphQL<{ roles: RoleSummary[] }>(query);
    return data.roles;
  },

  listModules: async (): Promise<ModuleInfo[]> => {
    const query = `
      query {
        modules {
          id
          label
          category
        }
      }
    `;
    const data = await fetchGraphQL<{ modules: ModuleInfo[] }>(query);
    return data.modules;
  },

  assignRole: async (staffUserId: string, roleId: string) => {
    const mutation = `
      mutation AssignRole($input: AssignRoleInput!) {
        assignRole(input: $input) {
          id
          roleId
          baseRole
        }
      }
    `;
    const data = await fetchGraphQL<{ assignRole: { id: string; roleId: string; baseRole: string } }>(
      mutation,
      { input: { staffUserId, roleId } },
    );
    return data.assignRole;
  },

  createRole: async (roleName: string, permissions: Omit<RolePermission, 'id' | 'divisionId'>[]) => {
    const mutation = `
      mutation CreateRole($input: CreateRoleInput!) {
        createRole(input: $input) {
          id
          roleName
          isSystemDefault
          staffCount
          permissions {
            id
            module
            divisionId
            canCreate
            canRead
            canUpdate
            canDelete
          }
        }
      }
    `;
    const data = await fetchGraphQL<{ createRole: RoleSummary }>(
      mutation,
      { input: { roleName, permissions } }
    );
    return data.createRole;
  }
};
