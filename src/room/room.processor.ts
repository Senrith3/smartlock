import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { CheckInDto } from './dto/check-in.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { TwilioService } from 'nestjs-twilio';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { RoomService } from './room.service';
import * as QRCode from 'qrcode';
import * as moment from 'moment';

@Processor('room-check-in')
export class RoomCheckInConsumer {
  constructor(private roomService: RoomService) {}

  @Process('checkInJob')
  async process(job: Job<CheckInDto>) {
    const data = job.data;
    await this.roomService.checkIn(data);
  }
}

@Processor('room-check-out')
export class RoomCheckOutConsumer {
  constructor(private roomService: RoomService) {}

  @Process('checkOutJob')
  async process(job: Job<CheckInDto>) {
    const data = job.data;
    await this.roomService.checkOut(data);
  }
}

@Processor('send-code')
export class SendCodeConsumer {
  constructor(
    private mailerService: MailerService,
    private readonly twilioService: TwilioService,
    private cloudinary: CloudinaryService,
  ) {}

  @Process('sendCodeJob')
  async process(job: Job<CheckInDto>) {
    const data = job.data;
    await QRCode.toFile(__dirname + '/code.png', data.code);

    if (data.email) {
      await this.sendEmail(data.email, data.startedAt, data.endedAt, data.room);
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
}
