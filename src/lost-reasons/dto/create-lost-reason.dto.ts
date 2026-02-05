import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateLostReasonDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
