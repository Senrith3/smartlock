import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { PreauthMiddleware } from './preauth.middleware';
import { PrismaService } from './prisma.service';
import { BookingsModule } from './bookings/bookings.module';
import { RoomModule } from './room/room.module';

@Module({
  imports: [BookingsModule, RoomModule],
  providers: [PrismaService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PreauthMiddleware).forRoutes({
      path: '*',
      method: RequestMethod.ALL,
    });
  }
}
