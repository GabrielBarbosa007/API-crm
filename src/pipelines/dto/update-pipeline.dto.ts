import { IsString, IsOptional, IsBoolean, IsEnum, IsInt, Min } from 'class-validator';
import { PipelineVisibility } from '@prisma/client';

export class UpdatePipelineDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsEnum(PipelineVisibility)
  visibility?: PipelineVisibility;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
