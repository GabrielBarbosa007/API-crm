import { IsString, IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { ActivityType } from '@prisma/client';

export class UpdateActivityDto {
  @IsOptional()
  @IsEnum(ActivityType)
  type?: ActivityType;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}

export class CompleteActivityDto {
  @IsOptional()
  @IsDateString()
  completedAt?: string;
}
