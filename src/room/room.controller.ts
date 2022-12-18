import { Controller, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Book, Room, User } from '@prisma/client';

@ApiBearerAuth()
@Controller('room')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomService.create(createRoomDto);
  }

  @Post('checkIn')
  async checkIn(
    @Body()
    data: Book & {
      Room: Room;
      User: User;
    },
  ) {
    await this.roomService.checkIn(data);
    return this.roomService.socket
      .to(data.Room.name)
      .emit('checkIn', data.code);
  }

  @Post('checkOut')
  checkOut(
    @Body()
    data,
  ) {
    return this.roomService.socket.to(data.room).emit('checkOut');
  }

  @Patch('unlockAll')
  unlockAll() {
    return this.roomService.socket.to('allRoom').emit('unlock');
  }

  @Patch('unlock/:name')
  unlockRoom(@Param('name') name: string) {
    return this.roomService.socket.to(name).emit('unlock');
  }

  @Patch('lockAll')
  lockAll() {
    return this.roomService.socket.to('allRoom').emit('lock');
  }

  @Patch('lock/:name')
  lockRoom(@Param('name') name: string) {
    return this.roomService.socket.to(name).emit('lock');
  }

  @Patch(':name')
  update(@Param('name') name: string, @Body() updateRoomDto: UpdateRoomDto) {
    return this.roomService.update(name, updateRoomDto);
  }

  @Delete(':name')
  remove(@Param('name') name: string) {
    return this.roomService.remove(name);
  }
}
