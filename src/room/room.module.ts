import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { TwilioModule } from 'nestjs-twilio';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { RoomGateway } from './room.gateway';
import { BullModule } from '@nestjs/bull';
import {
  RoomCheckInConsumer,
  RoomCheckOutConsumer,
  SendCodeConsumer,
} from './room.processor';
import { RedisModule } from '@liaoliaots/nestjs-redis';

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        service: 'gmail',
        secure: false,
        auth: {
          user: 'ney.senrith19@kit.edu.kh',
          pass: '015779765',
        },
      },
      defaults: {
        from: '"No Reply" <noreply@example.com>',
      },
      template: {
        dir: join(__dirname, 'mail'),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    }),
    TwilioModule.forRoot({
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
    }),
    CloudinaryModule,
    RedisModule.forRoot({
      config: {
        url: process.env.REDIS_URL,
      },
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
        db: 0,
      },
    }),
    BullModule.registerQueue(
      {
        name: 'send-code',
        defaultJobOptions: {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 10000,
          },
        },
      },
      {
        name: 'room-check-in',
        defaultJobOptions: {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 10000,
          },
        },
      },
      {
        name: 'room-check-out',
        defaultJobOptions: {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 15000,
          },
        },
      },
    ),
  ],
  controllers: [RoomController],
  providers: [
    RoomGateway,
    RoomService,
    SendCodeConsumer,
    RoomCheckInConsumer,
    RoomCheckOutConsumer,
  ],
})
export class RoomModule {}
