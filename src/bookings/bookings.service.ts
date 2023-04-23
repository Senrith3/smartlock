import { Injectable, NotAcceptableException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateBookingsDto } from './dto/create-bookings.dto';
import * as moment from 'moment';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class BookingsService {
  constructor(
    @InjectQueue('room-check-in') private roomCheckInQueue: Queue,
    @InjectQueue('room-check-out') private roomCheckOutQueue: Queue,
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

    const checkInJobs = [];
    const checkOutJobs = [];

    for (const transcation of transactions) {
      const oldCheckInJob = await this.roomCheckInQueue.getJob(transcation.id);
      if (oldCheckInJob) await oldCheckInJob.remove();
      checkInJobs.push({
        name: 'checkInJob',
        data: transcation,
        opts: {
          delay: Number(transcation.startedAt) - Number(Date.now()),
          jobId: transcation.id,
        },
      });

      const oldCheckOutJob = await this.roomCheckOutQueue.getJob(
        transcation.id,
      );
      if (oldCheckOutJob) await oldCheckOutJob.remove();
      checkOutJobs.push({
        name: 'checkOutJob',
        data: transcation,
        opts: {
          delay: Number(transcation.endedAt) - Number(Date.now()),
          jobId: transcation.id,
        },
      });
    }

    await this.roomCheckInQueue.addBulk(checkInJobs);
    await this.roomCheckOutQueue.addBulk(checkOutJobs);

    return true;
  }
}
