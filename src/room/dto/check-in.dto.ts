import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';

export class CheckInDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsPhoneNumber()
  @IsPhoneNumber('KH')
  @IsOptional()
  phoneNumber?: string;

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

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  code: string;
}
