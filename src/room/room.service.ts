import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Socket } from 'socket.io';
import { MailerService } from '@nestjs-modules/mailer';
import { TwilioService } from 'nestjs-twilio';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import * as QRCode from 'qrcode';
import { Book, Room, User } from '@prisma/client';
import { Server } from 'socket.io';

@Injectable()
export class RoomService {
  constructor(
    private prisma: PrismaService,
    private mailerService: MailerService,
    private readonly twilioService: TwilioService,
    private cloudinary: CloudinaryService,
  ) {}

  public socket: Server = null;

  async verifyClient(client: Socket) {
    const token = client.handshake.headers.authorization;
    if (
      token != null &&
      token != '' &&
      token.replace('Bearer ', '') === process.env.API_KEY
    ) {
      return true;
    } else {
      return false;
    }
  }

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

  async checkIn(
    book: Book & {
      Room: Room;
      User: User;
    },
  ) {
    await QRCode.toFile(__dirname + '/code.png', book.code);
    if (book.User.email) {
      await this.sendEmail(
        book.User.email,
        book.startedAt,
        book.endedAt,
        book.Room.name,
      );
    } else {
      const res = await this.cloudinary.uploadImage(__dirname + '/code.png');
      await this.sendSMS(
        book.User.phoneNumber,
        book.startedAt,
        book.endedAt,
        book.Room.name,
        res.url,
      );
    }
  }

  async sendEmail(email: string, startedAt: Date, endedAt: Date, room: string) {
    await this.mailerService.sendMail({
      to: email,
      from: '"Vkirirom" <support@example.com>',
      subject: 'QR code for Pipe Room',
      template: './confirmation',
      context: {
        email,
        startedAt: startedAt.toLocaleString(),
        endedAt: endedAt.toLocaleString(),
        room,
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
      body: `Hello Sir/Madam,\nWe have confirmed your checked in for Pipe Room number ${room}. \nYou can use the QR code below to unlock your room. \nQR_Code: ${url} \nThe code will be valid from ${startedAt.toLocaleString()} 2pm to ${endedAt.toLocaleString()} 12am. \nPlease make sure you take everything out of the room before 12am. \nThank you, \nVkirirom Pine Resort`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
  }
}
