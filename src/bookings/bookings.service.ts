import { Injectable, NotAcceptableException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/prisma.service';
import { CreateBookingsDto } from './dto/create-bookings.dto';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import * as moment from 'moment';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async createBookings(createBookingsDto: CreateBookingsDto) {
    const { items } = createBookingsDto;

    const transactions = items.reduce(
      (
        res: [],
        { email = '', phoneNumber = '', room, startedAt, endedAt },
        currentIndex,
      ) => {
        if (!email && !phoneNumber) throw new NotAcceptableException();

        const dupItem = items.find((i, index) => {
          return (
            moment(startedAt)
              .startOf('day')
              .isSame(moment(i.endedAt).startOf('day')) &&
            (i.email || '') === email &&
            (i.phoneNumber || '') === phoneNumber &&
            i.room === room &&
            currentIndex !== index
          );
        });

        if (dupItem) return res;

        let isExtended = false;

        do {
          const extendedItem = items.find(
            (i, index) =>
              moment(i.startedAt)
                .startOf('day')
                .isSame(moment(endedAt).startOf('day')) &&
              (i.email || '') === email &&
              (i.phoneNumber || '') === phoneNumber &&
              i.room === room &&
              currentIndex !== index,
          );
          if (extendedItem) {
            isExtended = true;
            endedAt = extendedItem.endedAt;
          } else {
            isExtended = false;
          }
        } while (isExtended);

        room = room.toLowerCase().replace(' ', '-');

        return [
          ...res,
          {
            data: {
              id: `${room}:${startedAt}`,
              startedAt,
              endedAt,
              code: randomUUID(),
              Room: {
                connectOrCreate: {
                  where: {
                    name: room,
                  },
                  create: {
                    name: room,
                  },
                },
              },
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
        await tx.book.upsert({
          where: { id: transaction.data.id },
          create: transaction.data,
          update: transaction.data,
        });
      }
    });

    for (const i of transactions) {
      const checkInKey = `event:room_check_in_date_reached:${i.data.id}`;
      const checkOutKey = `event:room_check_out_date_reached:${i.data.id}`;

      const startedAt = moment(i.data.startedAt);
      const endedAt = moment(i.data.endedAt);

      const checkInKeyExpireIn = Math.max(
        1,
        startedAt.diff(moment(), 'seconds'),
      );
      const checkOutKeyExpireIn = Math.max(
        1,
        endedAt.diff(moment(), 'seconds'),
      );

      this.redis
        .setex(checkInKey, checkInKeyExpireIn, i.data.id)
        .catch((err) => console.log(err));

      this.redis
        .setex(checkOutKey, checkOutKeyExpireIn, i.data.id)
        .catch((err) => console.log(err));
    }

    return true;
  }
}
