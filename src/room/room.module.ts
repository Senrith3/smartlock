import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { TwilioModule } from 'nestjs-twilio';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { RoomGateway } from './room.gateway';

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
  ],
  controllers: [RoomController],
  providers: [RoomGateway, RoomService],
})
export class RoomModule {}
