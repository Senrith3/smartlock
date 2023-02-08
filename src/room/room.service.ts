import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { MailerService } from '@nestjs-modules/mailer';
import { TwilioService } from 'nestjs-twilio';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import * as QRCode from 'qrcode';
import { Server } from 'socket.io';
import * as moment from 'moment';
import { CheckInDto } from './dto/check-in.dto';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import { CheckOutDto } from './dto/check-out.dto';
import { randomUUID } from 'crypto';
import { SocketDto } from './dto/socket.dto';
import { ResetAdminKeyDto } from './dto/reset-admin-key.dto';

@Injectable()
export class RoomService {
  constructor(
    private mailerService: MailerService,
    private readonly twilioService: TwilioService,
    private cloudinary: CloudinaryService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  public socket: Server = null;

  async verifyClient(client: Socket, data: SocketDto) {
    const key = await this.redis.get(
      data.room.toLowerCase().split(' ').join('-'),
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
    await QRCode.toFile(__dirname + '/code.png', data.code);
    try {
      if (data.email) {
        await this.sendEmail(
          data.email,
          data.startedAt,
          data.endedAt,
          data.room,
        );
      } else {
        const res = await this.cloudinary.uploadImage(__dirname + '/code.png');
        await this.sendSMS(
          data.phoneNumber,
          data.startedAt,
          data.endedAt,
          data.room,
          res.url,
        );
      }
      this.socket.to(data.room).emit('checkIn', data.code);
      return true;
    } catch (err) {
      console.log(err.message);
      const id = `${data.room}:${data.startedAt}`;
      const checkInKey = `event:room_check_in_date_reached:${id}`;
      const checkInKeyData = `event:room_check_in_date_reached:${id}:data`;
      const checkOutKey = `event:room_check_out_date_reached:${id}`;

      const endedAt = moment(data.endedAt);

      const checkInKeyExpireIn = 300;
      const checkOutKeyExpireIn = Math.max(
        1,
        endedAt.diff(moment(), 'seconds'),
      );

      this.redis
        .setex(checkInKey, checkInKeyExpireIn, id)
        .catch((err) => console.log(err));

      this.redis
        .set(checkInKeyData, JSON.stringify(data))
        .catch((err) => console.log(err));

      this.redis
        .setex(checkOutKey, checkOutKeyExpireIn, id)
        .catch((err) => console.log(err));
      return false;
    }
  }

  async checkOut(data: CheckOutDto) {
    const room = data.room.toLowerCase().split(' ').join('-');

    const id = `${room}:${data.startedAt}`;
    const checkInKey = `event:room_check_in_date_reached:${id}`;
    const checkInKeyData = `event:room_check_in_date_reached:${id}:data`;
    const checkOutKey = `event:room_check_out_date_reached:${id}`;

    await this.redis.del([checkInKey, checkInKeyData, checkOutKey]);

    if (
      moment(data.endedAt).startOf('D').isSame(moment().startOf('D'), 'day')
    ) {
      this.socket.to(room).emit('checkOut');
    }
    return true;
  }

  async sendEmail(email: string, startedAt: Date, endedAt: Date, room: string) {
    await this.mailerService.sendMail({
      to: email,
      from: '"Vkirirom" <support@example.com>',
      subject: 'QR code for Pipe Room',
      template: './confirmation',
      context: {
        email,
        startedAt: moment(startedAt).format('LLLL'),
        endedAt: moment(endedAt).format('LLLL'),
        room: room
          .toLowerCase()
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.substring(1))
          .join(' '),
      },
      attachments: [
        {
          filename: 'code.png',
          path: __dirname + '/code.png',
        },
      ],
    });
  }

  async sendSMS(
    phoneNumber: string,
    startedAt: Date,
    endedAt: Date,
    room: string,
    url: string,
  ) {
    return this.twilioService.client.messages.create({
      body: `Hello Sir/Madam,\nWe have confirmed your checked in for Pipe Room number ${room
        .toLowerCase()
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.substring(1))
        .join(
          ' ',
        )}. \nYou can use the QR code below to unlock your room. \nQR_Code: ${url} \nThe code will be valid from ${moment(
        startedAt,
      ).format('LLLL')} to ${moment(endedAt).format(
        'LLLL',
      )}. \nPlease make sure you take everything out of the room before 12am. \nThank you, \nVkirirom Pine Resort`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
  }

  async getAllConnectedRooms() {
    const sockets = await this.socket.fetchSockets();
    return sockets.map((i) => [...i.rooms][1]);
  }

  async setRoomsKey(rooms: string[]) {
    rooms = rooms.map((r) => r.toLowerCase().split(' ').join('-'));
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
    await QRCode.toFile(__dirname + '/code.png', code);
    this.redis
      .setex('smart-lock=admin-key', endedAt.diff(startedAt, 'seconds'), code)
      .catch((err) => console.log(err));
    await this.sendEmail(
      resetAdminKeyDto.email ?? process.env.ADMIN_EMAIL,
      startedAt.toDate(),
      endedAt.toDate(),
      'Admin',
    );
  }

  async getAdminKey() {
    return await this.redis.get('smart-lock=admin-key');
  }
}
