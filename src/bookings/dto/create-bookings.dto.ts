import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreateBookingDto {
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
  @IsNotEmpty()
  @IsString()
  room: string;
}

export class CreateBookingsDto {
  @ApiProperty({ type: () => [CreateBookingDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateBookingDto)
  @IsNotEmpty()
  items: CreateBookingDto[];

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  startedAt: Date;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  endedAt: Date;
}
