import { IsString, IsOptional, IsBoolean, IsEnum, IsInt, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PipelineVisibility } from '@prisma/client';

export class CreateStageDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsBoolean()
  isWon?: boolean;

  @IsOptional()
  @IsBoolean()
  isLost?: boolean;
}

export class CreatePipelineDto {
  @IsString()
  name: string;

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStageDto)
  stages?: CreateStageDto[];
}
