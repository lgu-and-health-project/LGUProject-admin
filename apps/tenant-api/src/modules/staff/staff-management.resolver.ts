import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StaffManagementService } from './staff-management.service';
import { StaffUserModel } from './models/staff-user.model';
import { AddStaffInput } from './dto/add-staff.input';

interface RequestUser {
  userId: string;
  orgCode: string;
  departmentId: string | null;
  role?: string | null;
}

@Resolver()
@UseGuards(GqlAuthGuard)
export class StaffManagementResolver {
  constructor(private staffManagementService: StaffManagementService) {}

  @Query(() => [StaffUserModel])
  staffMembers(
    @CurrentUser() user: RequestUser,
  ): Promise<StaffUserModel[]> {
    return this.staffManagementService.listStaff(user);
  }

  @Mutation(() => StaffUserModel)
  addStaff(
    @Args('input') input: AddStaffInput,
    @CurrentUser() user: RequestUser,
  ): Promise<StaffUserModel> {
    return this.staffManagementService.addStaff(user, input);
  }
}
