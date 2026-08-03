export interface ModulePermission {
  module: string;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}
