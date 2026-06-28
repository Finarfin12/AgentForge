import {
  WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection,
  OnGatewayDisconnect, ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { MeshService } from './mesh.service';

@WebSocketGateway({ namespace: '/mesh', cors: { origin: '*', credentials: true } })
export class MeshGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(MeshGateway.name);

  constructor(private meshService: MeshService) {}

  handleConnection(client: Socket) {
    const nodeId = client.handshake.query.nodeId as string || client.id;
    const agentId = client.handshake.query.agentId as string;
    const name = client.handshake.query.name as string || nodeId;

    this.meshService.registerNode(nodeId, client, {
      name, agentId, address: client.handshake.address,
      capabilities: ['websocket'],
    });

    client.emit('mesh:registered', { nodeId });
    this.broadcastNodeList();
    this.logger.log(`Mesh client connected: ${name} (${nodeId})`);
  }

  handleDisconnect(client: Socket) {
    const nodeId = client.handshake.query.nodeId as string || client.id;
    this.meshService.unregisterNode(nodeId);
    this.broadcastNodeList();
    this.logger.log(`Mesh client disconnected: ${nodeId}`);
  }

  @SubscribeMessage('mesh:message')
  handleMessage(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    const from = client.handshake.query.nodeId as string || client.id;
    this.meshService.handleMessage({ from, ...data, timestamp: new Date() });
  }

  @SubscribeMessage('mesh:ping')
  handlePing(@ConnectedSocket() client: Socket) {
    const nodeId = client.handshake.query.nodeId as string || client.id;
    this.meshService.updateHeartbeat(nodeId);
    client.emit('mesh:pong', { timestamp: new Date() });
  }

  @SubscribeMessage('mesh:signal')
  handleSignal(@ConnectedSocket() client: Socket, @MessageBody() data: { to: string; signal: any }) {
    // Forward WebRTC signaling data to the target peer
    const from = client.handshake.query.nodeId as string || client.id;
    this.meshService.sendToNode(data.to, {
      from, to: data.to, type: 'signal', payload: data.signal,
    } as any);
  }

  @SubscribeMessage('mesh:get-nodes')
  handleGetNodes(@ConnectedSocket() client: Socket) {
    client.emit('mesh:node-list', this.meshService.getNodes());
  }

  private broadcastNodeList() {
    this.server.emit('mesh:node-list', this.meshService.getNodes());
  }
}
