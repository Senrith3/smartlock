import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SocketDto } from './dto/socket.dto';
import { RoomService } from './room.service';

@WebSocketGateway({ cors: true, namespace: '/room' })
export class RoomGateway {
  constructor(private readonly roomService: RoomService) {}
  @WebSocketServer() public server: Server;

  afterInit(server: Server) {
    this.roomService.socket = server;
  }

  @SubscribeMessage('joinRoom')
  async handleRoomJoin(client: Socket, data: SocketDto) {
    const verified = await this.roomService.verifyClient(client, data);

    if (!verified) {
      client.disconnect();
      return;
    }

    client.join(data.room);
    client.join('allRoom');
    client.emit('joinedRoom', data.room);
  }

  @SubscribeMessage('leaveRoom')
  async handleRoomLeave(client: Socket, data: SocketDto) {
    const verified = await this.roomService.verifyClient(client, data);

    if (!verified) {
      client.disconnect();
      return;
    }

    client.leave(data.room);
    client.leave('allRoom');
    client.emit('leftRoom', data.room);
  }
}
