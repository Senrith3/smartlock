import { Injectable, NotAcceptableException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateBookingsDto } from './dto/create-bookings.dto';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import * as moment from 'moment';

@Injectable()
export class BookingsService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

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

        room = room
          .toLowerCase()
          .replace(/ /g, '-')
          .replace(/\b0*(\d+)/g, '$1');

        return [
          ...res,
          {
            id: `${room}:${startedAt}`,
            startedAt,
            endedAt,
            code: randomUUID(),
            email,
            room,
            phoneNumber,
          },
        ];
      },
      [],
    );

    for (const i of transactions) {
      const checkInKey = `event:room_check_in_date_reached:${i.id}`;
      const checkInKeyData = `event:room_check_in_date_reached:${i.id}:data`;
      const checkOutKey = `event:room_check_out_date_reached:${i.id}`;

      const startedAt = moment(i.startedAt);
      const endedAt = moment(i.endedAt);

      const checkInKeyExpireIn = Math.max(
        1,
        startedAt.diff(moment(), 'seconds'),
      );
      const checkOutKeyExpireIn = Math.max(
        10,
        endedAt.diff(moment(), 'seconds'),
      );

      this.redis
        .setex(checkInKey, checkInKeyExpireIn, i.id)
        .catch((err) => console.log(err));

      this.redis
        .set(checkInKeyData, JSON.stringify(i))
        .catch((err) => console.log(err));

      this.redis
        .setex(checkOutKey, checkOutKeyExpireIn, i.id)
        .catch((err) => console.log(err));
    }

    return true;
  }
}
