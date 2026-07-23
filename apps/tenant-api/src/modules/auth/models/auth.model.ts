import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class ModulePermission {
  @Field()
  module!: string;

  @Field(() => Boolean)
  create!: boolean;

  @Field(() => Boolean)
  read!: boolean;

  @Field(() => Boolean)
  update!: boolean;

  @Field(() => Boolean)
  delete!: boolean;
}

@ObjectType()
export class CurrentUser {
  @Field()
  userId!: string;

  @Field()
  email!: string;

  @Field(() => String, { nullable: true })
  role!: string | null;

  @Field()
  orgCode!: string;

  @Field(() => String, { nullable: true })
  departmentId!: string | null;

  @Field(() => [ModulePermission])
  permissions!: ModulePermission[];
}

@ObjectType()
export class LoginResponse {
  @Field(() => CurrentUser)
  user!: CurrentUser;
}

@ObjectType()
export class MeResponse {
  @Field(() => CurrentUser)
  user!: CurrentUser;
}
