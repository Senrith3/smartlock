import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { PreauthMiddleware } from './preauth.middleware';
import { BookingsModule } from './bookings/bookings.module';
import { RoomModule } from './room/room.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    BookingsModule,
    RoomModule,
    ConfigModule.forRoot({ isGlobal: true }),
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PreauthMiddleware).forRoutes({
      path: '*',
      method: RequestMethod.ALL,
    });
  }
}
