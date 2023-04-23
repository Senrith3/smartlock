import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CheckOutDto {
  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  startedAt: Date;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  endedAt: Date;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  room: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;
}
