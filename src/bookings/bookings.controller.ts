import { Controller, Post, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingsDto } from './dto/create-bookings.dto';

@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @ApiTags('Admin')
  @Post()
  async createBookings(
    @Body() createBookingsDto: CreateBookingsDto,
  ): Promise<boolean> {
    return await this.bookingsService.createBookings(createBookingsDto);
  }
}
