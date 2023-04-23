export class CheckInDto {
  email?: string;
  phoneNumber?: string;
  startedAt: Date;
  endedAt: Date;
  room: string;
  code: string;
}
