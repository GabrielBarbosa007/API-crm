import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { Role } from '@prisma/client';

export class InviteUserDto {
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Role inválido' })
  role?: Role;
}
