import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { Server } from 'socket.io';
import * as moment from 'moment';
import { CheckInDto } from './dto/check-in.dto';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import { CheckOutDto } from './dto/check-out.dto';
import { randomUUID } from 'crypto';
import { SocketDto } from './dto/socket.dto';
import { ResetAdminKeyDto } from './dto/reset-admin-key.dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class RoomService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectQueue('send-code') private sendCodeQueue: Queue,
    @InjectQueue('room-check-in') private roomCheckInQueue: Queue,
    @InjectQueue('room-check-out') private roomCheckOutQueue: Queue,
  ) {}

  public socket: Server = null;

  async verifyClient(client: Socket, data: SocketDto) {
    const key = await this.redis.get(
      data.room
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/\b0*(\d+)/g, '$1'),
    );
    const token = client.handshake.headers.authorization;
    if (
      token != null &&
      token != '' &&
      token.replace('Bearer ', '') === process.env.ROOM_API_KEY &&
      key === data.key
    ) {
      return true;
    } else {
      return false;
    }
  }

  async checkIn(data: CheckInDto) {
    const rooms = await this.getAllConnectedRooms();
    if (!rooms.includes(data.room)) {
      throw new Error(`Room ${data.room} in not connected`);
    }
    await this.sendCodeQueue
      .add('sendCodeJob', {
        ...data,
      })
      .catch((e) => console.log(e));
    this.socket.to(data.room).emit('checkIn', data.code);
  }

  async checkOut(data: CheckOutDto) {
    const rooms = await this.getAllConnectedRooms();
    if (!rooms.includes(data.room)) {
      throw new Error(`Room ${data.room} in not connected`);
    }
    const id = `${data.room}:${data.startedAt}`;
    let code = data.code;
    if (!code) {
      const checkInData = await this.roomCheckInQueue.getJob(id);
      const checkOutData = await this.roomCheckOutQueue.getJob(id);
      if (checkInData) code = checkInData.data.code;
      if (checkOutData) code = checkOutData.data.code;
      this.roomCheckInQueue.removeJobs(id);
      this.roomCheckOutQueue.removeJobs(id);
    }
    this.socket.to(data.room).emit('checkOut', code);
  }

  async getAllConnectedRooms() {
    const sockets = await this.socket.fetchSockets();
    return sockets.map((i) => [...i.rooms][1]);
  }

  async setRoomsKey(rooms: string[]) {
    rooms = rooms.map((r) =>
      r
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/\b0*(\d+)/g, '$1'),
    );
    const data = rooms.reduce((res: [], room) => {
      const key = randomUUID();
      this.redis.set(room, key);
      return [...res, { room, key }];
    }, []);
    return data;
  }

  async resetAdminKey(resetAdminKeyDto: ResetAdminKeyDto) {
    const code = randomUUID();
    const endedAt = moment().add(1, 'weeks').startOf('isoWeek');
    const startedAt = moment();
    this.redis.set('smart-lock-admin-key', code);
    await this.sendCodeQueue.add('sendCodeJob', {
      email: resetAdminKeyDto.email ?? process.env.ADMIN_EMAIL,
      startedAt: startedAt.toDate(),
      endedAt: endedAt.toDate(),
      room: 'Admin',
      code,
    });
  }

  async getAdminKey() {
    return await this.redis.get('smart-lock-admin-key');
  }

  @Cron('0 0 * * 1')
  handleCron() {
    this.resetAdminKey({});
  }
}
