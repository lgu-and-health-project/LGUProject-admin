import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RbacService } from './rbac.service';
import { ModuleModel } from './models/module.model';
import { RoleModel } from './models/role.model';
import { StaffUserModel } from '../staff/models/staff-user.model';
import { AssignRoleInput } from './dto/assign-role.input';
import { CreateRoleInput } from './dto/create-role.input';

interface RequestUser {
  userId: string;
  orgCode: string;
  role: string | null;
}

@Resolver()
@UseGuards(GqlAuthGuard)
export class RbacResolver {
  constructor(private rbacService: RbacService) {}

  @Query(() => [ModuleModel])
  modules(): Promise<ModuleModel[]> {
    return this.rbacService.listModules();
  }

  @Query(() => [RoleModel])
  roles(@CurrentUser() user: RequestUser): Promise<RoleModel[]> {
    return this.rbacService.listRoles(user);
  }

  @Mutation(() => StaffUserModel)
  assignRole(
    @Args('input') input: AssignRoleInput,
    @CurrentUser() user: RequestUser,
  ): Promise<StaffUserModel> {
    return this.rbacService.assignRole(user, input.staffUserId, input.roleId);
  }

  @Mutation(() => RoleModel)
  deleteRole(
    @Args('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<RoleModel> {
    return this.rbacService.deleteRole(user, id);
  }

  @Mutation(() => RoleModel)
  createRole(
    @Args('input') input: CreateRoleInput,
    @CurrentUser() user: RequestUser,
  ): Promise<RoleModel> {
    return this.rbacService.createRole(user, input.roleName, input.permissions);
  }
}
