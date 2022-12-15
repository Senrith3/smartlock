import { Controller, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('room')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomService.create(createRoomDto);
  }

  @Patch('unlockAll')
  unlockAll() {
    return this.roomService.unlockAll();
  }

  @Patch('lockAll')
  lockAll() {
    return this.roomService.lockAll();
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
