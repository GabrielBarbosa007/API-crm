import { IsOptional, IsEnum, IsUUID, IsDateString, IsInt, Min, IsString, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ActivityType } from '@prisma/client';

export class FilterActivitiesDto {
  @IsOptional()
  @IsEnum(ActivityType)
  type?: ActivityType;

  @IsOptional()
  @IsUUID()
  dealId?: string;

  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsUUID()
  createdById?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @IsOptional()
  @IsDateString()
  dueDateTo?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
