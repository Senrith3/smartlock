import { MailerService } from '@nestjs-modules/mailer';
import {
  ConflictException,
  Injectable,
  NotAcceptableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { TwilioService } from 'nestjs-twilio';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { PrismaService } from 'src/prisma.service';
import { CreateBookingsDto } from './dto/create-bookings.dto';
import { UpdateBookingsDto } from './dto/update-bookings.dto';
import * as QRCode from 'qrcode';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private mailerService: MailerService,
    private readonly twilioService: TwilioService,
    private cloudinary: CloudinaryService,
  ) {}

  async createBookings(createBookingsDto: CreateBookingsDto) {
    const { items, startedAt, endedAt } = createBookingsDto;

    const availableRooms = await this.prisma.room.count({
      where: {
        name: { in: items.map((i) => i.room) },
        books: {
          none: {
            startedAt: {
              lte: endedAt,
              gte: startedAt,
            },
            endedAt: {
              lte: endedAt,
              gte: startedAt,
            },
            status: {
              in: ['IN_PROGRESS'],
            },
          },
        },
      },
    });

    if (availableRooms !== items.length) throw new ConflictException();

    const transactions = items.reduce(
      (res: [], { email = '', phoneNumber = '', room }) => {
        if (!email && !phoneNumber) throw new NotAcceptableException();
        return [
          ...res,
          {
            data: {
              startedAt,
              endedAt,
              code: randomUUID(),
              Room: { connect: { name: room } },
              User: {
                connectOrCreate: {
                  where: {
                    email_phoneNumber: {
                      email,
                      phoneNumber,
                    },
                  },
                  create: {
                    email,
                    phoneNumber,
                  },
                },
              },
            },
            email,
            room,
            phoneNumber,
          },
        ];
      },
      [],
    );

    await this.prisma.$transaction(async (tx) => {
      for (const transaction of transactions) {
        await tx.book.create({ data: transaction.data });
      }
    });

    for (const i of transactions) {
      await QRCode.toFile(__dirname + '/code.png', i.data.code);
      if (i.email) {
        await this.sendEmail(i.email, startedAt, endedAt, i.room);
      } else {
        const res = await this.cloudinary.uploadImage(__dirname + '/code.png');
        await this.sendSMS(i.phoneNumber, startedAt, endedAt, i.room, res.url);
      }
    }

    return true;
  }

  async updateBookings(updateBookingsDto: UpdateBookingsDto) {
    const { items, startedAt, endedAt, newStartedAt, newEndedAt, status } =
      updateBookingsDto;

    const data: Prisma.BookUpdateManyMutationInput = {};

    if (newStartedAt) data.startedAt = newStartedAt;

    if (newEndedAt) data.endedAt = newEndedAt;

    if (status) data.status = status;

    return await this.prisma.book.updateMany({
      data,
      where: {
        startedAt,
        endedAt,
        Room: { name: { in: items.map((i) => i.room) } },
        User: {
          email: { in: items.map((i) => i.email || '') },
          phoneNumber: { in: items.map((i) => i.phoneNumber || '') },
        },
      },
    });
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
