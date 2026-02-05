import { IsString, IsOptional, IsEnum, IsBoolean, IsInt, Min, IsArray } from 'class-validator';
import { CustomFieldEntity, CustomFieldType } from '@prisma/client';

export class CreateCustomFieldDto {
  @IsEnum(CustomFieldEntity)
  entity: CustomFieldEntity;

  @IsString()
  name: string;

  @IsString()
  label: string;

  @IsEnum(CustomFieldType)
  type: CustomFieldType;

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
