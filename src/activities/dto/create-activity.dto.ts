import { IsString, IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { ActivityType } from '@prisma/client';

export class CreateActivityDto {
  @IsEnum(ActivityType)
  type: ActivityType;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsUUID()
  dealId?: string;

  @IsOptional()
  @IsUUID()
  leadId?: string;
}
