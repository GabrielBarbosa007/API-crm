import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { LeadTemperature, LeadStatus, LeadPriority, LeadSource } from '@prisma/client';

export class CreateLeadDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(8)
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(LeadTemperature)
  temperature?: LeadTemperature;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsEnum(LeadPriority)
  priority?: LeadPriority;

  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}
