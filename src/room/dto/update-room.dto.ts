import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateRoomDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  newName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  unlocked?: boolean;
}
