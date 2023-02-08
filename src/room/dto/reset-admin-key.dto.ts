import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEmail } from 'class-validator';

export class ResetAdminKeyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
}
