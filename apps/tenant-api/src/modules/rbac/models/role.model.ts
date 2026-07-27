import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class RolePermissionModel {
  @Field(() => ID)
  id!: string;

  @Field()
  module!: string;

  @Field(() => String, { nullable: true })
  divisionId!: string | null;

  @Field()
  canCreate!: boolean;

  @Field()
  canRead!: boolean;

  @Field()
  canUpdate!: boolean;

  @Field()
  canDelete!: boolean;
}

@ObjectType()
export class RoleModel {
  @Field(() => ID)
  id!: string;

  @Field()
  roleName!: string;

  @Field()
  isSystemDefault!: boolean;

  @Field(() => Int)
  staffCount!: number;

  @Field(() => [RolePermissionModel])
  permissions!: RolePermissionModel[];
}
