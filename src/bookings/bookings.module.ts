import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { RedisModule } from '@liaoliaots/nestjs-redis';

@Module({
  imports: [
    RedisModule.forRoot({
      config: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT as unknown as number,
        password: process.env.REDIS_PASSWORD,
      },
    }),
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
