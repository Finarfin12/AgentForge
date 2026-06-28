import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { AgentsService } from './agents.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/agents' })
export class AgentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(AgentsGateway.name);

  constructor(private agentsService: AgentsService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('agent:heartbeat')
  async handleHeartbeat(
    @MessageBody() data: { agentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const result = await this.agentsService.heartbeat(data.agentId);
      // Broadcast updated status to all connected clients
      this.server.emit('agent:status', result);
      return { event: 'agent:heartbeat:ack', data: result };
    } catch (err) {
      return { event: 'agent:heartbeat:error', data: { message: (err as Error).message } };
    }
  }

  @SubscribeMessage('agent:status')
  async handleStatusUpdate(
    @MessageBody() data: { agentId: string; status: 'idle' | 'busy' | 'offline' | 'error' },
  ) {
    try {
      const result = await this.agentsService.updateStatus(data.agentId, data.status);
      this.server.emit('agent:status', result);
      return { event: 'agent:status:ack', data: result };
    } catch (err) {
      return { event: 'agent:status:error', data: { message: (err as Error).message } };
    }
  }

  // Utility: broadcast agent update from service layer
  broadcastAgentUpdate(agentId: string, payload: Record<string, unknown>) {
    this.server.emit('agent:updated', { agentId, ...payload });
  }
}
