import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  IsInt,
  Max,
  IsDateString,
} from 'class-validator';

export class CreateDealDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsUUID()
  leadId: string;

  @IsOptional()
  @IsUUID()
  pipelineId?: string;

  @IsOptional()
  @IsUUID()
  stageId?: string;

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
