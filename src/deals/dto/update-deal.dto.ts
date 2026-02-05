import { IsNumber, IsOptional, IsString, IsUUID, Min, IsInt, Max, IsDateString } from 'class-validator';

export class UpdateDealDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsUUID()
  stageId?: string;

  @IsOptional()
  @IsUUID()
  pipelineId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number;

  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;
}
