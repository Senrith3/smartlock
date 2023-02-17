import { Controller, Post, Body, Patch, Param, Get } from '@nestjs/common';
import { RoomService } from './room.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { SetRoomsKeyDto } from './dto/set-rooms-key.dto';
import { ResetAdminKeyDto } from './dto/reset-admin-key.dto';

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
  async unlockAll() {
    const key = await this.roomService.getAdminKey();
    return this.roomService.socket.to('allRoom').emit('unlock', key);
  }

  @ApiTags('Admin')
  @Patch('unlock/:name')
  async unlockRoom(@Param('name') name: string) {
    const key = await this.roomService.getAdminKey();
    return this.roomService.socket
      .to(
        name
          .toLowerCase()
          .replace(/ /g, '-')
          .replace(/\b0*(\d+)/g, '$1'),
      )
      .emit('unlock', key);
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
      .to(
        name
          .toLowerCase()
          .replace(/ /g, '-')
          .replace(/\b0*(\d+)/g, '$1'),
      )
      .emit('lock');
  }

  @ApiTags('Admin')
  @Patch('resetAdminKey')
  resetAdminKey(@Body() resetAdminKeyDto: ResetAdminKeyDto) {
    return this.roomService.resetAdminKey(resetAdminKeyDto);
  }

  @ApiTags('SmartLock Team')
  @Get('getAllConnectedRooms')
  async getAllConnectedRooms() {
    return await this.roomService.getAllConnectedRooms();
  }

  @ApiTags('SmartLock Team')
  @Post('setRoomsKey')
  async setRoomsKey(@Body() setRoomsKey: SetRoomsKeyDto) {
    return await this.roomService.setRoomsKey(setRoomsKey.rooms);
  }
}
