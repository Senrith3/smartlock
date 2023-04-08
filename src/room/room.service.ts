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

@Injectable()
export class RoomService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectQueue('send-code') private sendCodeQueue: Queue,
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
    // const rooms = await this.getAllConnectedRooms();
    // if (!rooms.includes(data.room)) {
    //   throw `Room ${data.room} in not connected`;
    // }
    await this.sendCodeQueue
      .add(
        'sendCodeJob',
        {
          ...data,
        },
        {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      )
      .catch((e) => console.log(e));
    this.socket.to(data.room).emit('checkIn', data.code);
    return true;
  }

  async checkOut(data: CheckOutDto) {
    const room = data.room
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/\b0*(\d+)/g, '$1');
    const id = `${room}:${data.startedAt}`;
    const checkInKey = `event:room_check_in_date_reached:${id}`;
    const checkInKeyData = `event:room_check_in_date_reached:${id}:data`;
    const checkOutKey = `event:room_check_out_date_reached:${id}`;
    // const rooms = await this.getAllConnectedRooms();

    // if (!rooms.includes(data.room)) {
    //   this.redis.setex(checkOutKey, 30, id).catch((err) => console.log(err));
    //   return false;
    // }

    const checkoutData = await this.redis.get(checkInKeyData);
    if (!checkoutData) return false;

    if (
      moment(data.endedAt)
        .startOf('D')
        .isSame(moment(data.endedAt).startOf('D'), 'day')
    ) {
      await this.redis.del([checkInKey, checkInKeyData, checkOutKey]);
      this.socket.to(room).emit('checkOut', JSON.parse(checkoutData).code);
    }
    return true;
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
    const endedAt = moment().day(8).startOf('D');
    const startedAt = moment();
    this.redis
      .setex('smart-lock=admin-key', endedAt.diff(startedAt, 'seconds'), code)
      .catch((err) => console.log(err));
    await this.sendCodeQueue.add({
      email: resetAdminKeyDto.email ?? process.env.ADMIN_EMAIL,
      startedAt: startedAt.toDate(),
      endedAt: endedAt.toDate(),
      room: 'Admin',
    });
  }

  async getAdminKey() {
    return await this.redis.get('smart-lock=admin-key');
  }
}
