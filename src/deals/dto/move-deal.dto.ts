import { IsUUID, IsOptional, IsString } from 'class-validator';

export class MoveDealDto {
  @IsUUID()
  stageId: string;

  @IsOptional()
  @IsUUID()
  lostReasonId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
