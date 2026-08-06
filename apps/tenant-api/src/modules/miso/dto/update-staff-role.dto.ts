import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStaffRoleDto {
  @ApiProperty({ example: 'role-uuid-1234', description: 'The ID of the new role' })
  @IsString()
  roleId: string;
}
