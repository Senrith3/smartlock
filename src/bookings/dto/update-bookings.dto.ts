import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { BookStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { CreateBookingDto, CreateBookingsDto } from './create-bookings.dto';

export class UpdateBookingDto extends CreateBookingDto {}
export class UpdateBookingsDto extends OmitType(CreateBookingsDto, [
  'items',
] as const) {
  @ApiProperty({ type: () => [UpdateBookingDto] })
  @ValidateNested({ each: true })
  @Type(() => UpdateBookingDto)
  @IsNotEmpty()
  items: UpdateBookingDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  newStartedAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  newEndedAt?: Date;

  @ApiPropertyOptional({ enum: BookStatus })
  @IsOptional()
  @IsEnum(BookStatus)
  status?: BookStatus;
}
