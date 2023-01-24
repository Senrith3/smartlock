import { Controller, Post, Body, Patch, Param, Get } from '@nestjs/common';
import { RoomService } from './room.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { SetRoomsKeyDto } from './dto/set-rooms-key.dto';

@ApiBearerAuth()
@Controller('room')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @ApiTags('SmartLock BG')
  @Post('checkIn')
  async checkIn(@Body() checkInDto: CheckInDto) {
    return await this.roomService.checkIn(checkInDto);
  }

  @ApiTags('SmartLock BG', 'Admin')
  @Post('checkOut')
  checkOut(@Body() checkOutDto: CheckOutDto) {
    return this.roomService.checkOut(checkOutDto);
  }

  @ApiTags('Admin')
  @Patch('unlockAll')
  unlockAll() {
    return this.roomService.socket.to('allRoom').emit('unlock');
  }

  @ApiTags('Admin')
  @Patch('unlock/:name')
  unlockRoom(@Param('name') name: string) {
    return this.roomService.socket
      .to(name.toLowerCase().split(' ').join('-'))
      .emit('unlock');
  }

  @ApiTags('Admin')
  @Patch('lockAll')
  lockAll() {
    return this.roomService.socket.to('allRoom').emit('lock');
  }

  @ApiTags('Admin')
  @Patch('lock/:name')
  lockRoom(@Param('name') name: string) {
    return this.roomService.socket
      .to(name.toLowerCase().split(' ').join('-'))
      .emit('lock');
  }

  @ApiTags('Admin')
  @Get('getAllConnectedRooms')
  async getAllConnectedRooms() {
    return await this.roomService.getAllConnectedRooms();
  }

  @ApiTags('Admin')
  @Post('setRoomsKey')
  async setRoomsKey(@Body() setRoomsKey: SetRoomsKeyDto) {
    return await this.roomService.setRoomsKey(setRoomsKey.rooms);
  }
}
