import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty } from 'class-validator';

export class SetRoomsKeyDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsArray()
  rooms: string[];
}
