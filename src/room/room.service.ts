import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomService {
  constructor(private prisma: PrismaService) {}

  async create(createRoomDto: CreateRoomDto) {
    return await this.prisma.room.create({
      data: createRoomDto,
    });
  }

  async update(name: string, updateRoomDto: UpdateRoomDto) {
    return await this.prisma.room.update({
      data: updateRoomDto,
      where: { name },
    });
  }

  async remove(name: string) {
    return await this.prisma.room.delete({
      where: { name },
    });
  }

  async unlockAll() {
    return await this.prisma.room.updateMany({ data: { unlocked: true } });
  }

  async lockAll() {
    return await this.prisma.room.updateMany({ data: { unlocked: false } });
  }
}
