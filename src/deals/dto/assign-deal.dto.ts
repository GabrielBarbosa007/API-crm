import { IsOptional, IsUUID } from 'class-validator';

export class AssignDealDto {
  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}
