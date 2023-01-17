import { Controller, Post, Body, Patch, Param, Get } from '@nestjs/common';
import { RoomService } from './room.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { SetRoomsKeyDto } from './dto/set-rooms-key.dto';

@ApiBearerAuth()
@Controller('room')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post('checkIn')
  async checkIn(@Body() checkInDto: CheckInDto) {
    return await this.roomService.checkIn(checkInDto);
  }

  @Post('checkOut')
  checkOut(@Body() checkOutDto: CheckOutDto) {
    return this.roomService.checkOut(checkOutDto);
  }

  @Patch('unlockAll')
  unlockAll() {
    return this.roomService.socket.to('allRoom').emit('unlock');
  }

  @Patch('unlock/:name')
  unlockRoom(@Param('name') name: string) {
    return this.roomService.socket
      .to(name.toLowerCase().split(' ').join('-'))
      .emit('unlock');
  }

  @Patch('lockAll')
  lockAll() {
    return this.roomService.socket.to('allRoom').emit('lock');
  }

  @Patch('lock/:name')
  lockRoom(@Param('name') name: string) {
    return this.roomService.socket
      .to(name.toLowerCase().split(' ').join('-'))
      .emit('lock');
  }

  @Get('getAllConnectedRooms')
  async getAllConnectedRooms() {
    return await this.roomService.getAllConnectedRooms();
  }

  @Post('setRoomsKey')
  async setRoomsKey(@Body() setRoomsKey: SetRoomsKeyDto) {
    return await this.roomService.setRoomsKey(setRoomsKey.rooms);
  }
}
