import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SocketDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  room: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  key: string;
}
