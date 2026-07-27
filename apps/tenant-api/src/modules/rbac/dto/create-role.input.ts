import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class RolePermissionInput {
  @Field()
  module!: string;

  @Field(() => Boolean)
  canCreate!: boolean;

  @Field(() => Boolean)
  canRead!: boolean;

  @Field(() => Boolean)
  canUpdate!: boolean;

  @Field(() => Boolean)
  canDelete!: boolean;
}

@InputType()
export class CreateRoleInput {
  @Field()
  roleName!: string;

  @Field(() => [RolePermissionInput])
  permissions!: RolePermissionInput[];
}
