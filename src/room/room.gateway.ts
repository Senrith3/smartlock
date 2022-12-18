import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomService } from './room.service';

@WebSocketGateway(80, { cors: true, namespace: '/room' })
export class RoomGateway {
  constructor(private readonly roomService: RoomService) {}
  @WebSocketServer() public server: Server;

  afterInit(server: Server) {
    this.roomService.socket = server;
  }

  @SubscribeMessage('joinRoom')
  async handleRoomJoin(client: Socket, room: string) {
    const verified = await this.roomService.verifyClient(client);

    if (!verified) {
      client.disconnect();
      return;
    }

    client.join(room);
    client.join('allRoom');
    client.emit('joinedRoom', room);
  }

  @SubscribeMessage('leaveRoom')
  async handleRoomLeave(client: Socket, room: string) {
    const verified = await this.roomService.verifyClient(client);

    if (!verified) {
      client.disconnect();
      return;
    }

    client.leave(room);
    client.leave('allRoom');
    client.emit('leftRoom', room);
  }
}
