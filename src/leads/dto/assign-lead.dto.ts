import { IsOptional, IsUUID } from 'class-validator';

export class AssignLeadDto {
  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}
