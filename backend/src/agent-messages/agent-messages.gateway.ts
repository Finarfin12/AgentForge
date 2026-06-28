import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/agent-messages' })
export class AgentMessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(AgentMessagesGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Agent-messages client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Agent-messages client disconnected: ${client.id}`);
  }

  broadcastNewMessage(msg: any) {
    this.server.emit('agent-message:new', msg);
  }
}
