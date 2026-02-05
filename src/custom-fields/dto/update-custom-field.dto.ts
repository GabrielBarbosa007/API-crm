import { IsString, IsOptional, IsEnum, IsBoolean, IsInt, Min, IsArray } from 'class-validator';
import { CustomFieldType } from '@prisma/client';

export class UpdateCustomFieldDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsEnum(CustomFieldType)
  type?: CustomFieldType;

  @IsOptional()
  @IsArray()
  options?: string[];

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class SetCustomFieldValueDto {
  @IsString()
  customFieldId: string;

  @IsString()
  value: string;
}
