import { Injectable, Logger } from '@nestjs/common';

export interface MeshNode {
  id: string;
  agentId?: string;
  name: string;
  address: string;
  connectedAt: Date;
  lastSeen: Date;
  capabilities: string[];
  metadata?: Record<string, any>;
}

export interface MeshMessage {
  from: string;
  to: string;
  type: 'task' | 'response' | 'signal' | 'ping' | 'peer-list';
  payload: any;
  timestamp: Date;
}

@Injectable()
export class MeshService {
  private readonly logger = new Logger(MeshService.name);
  private nodes = new Map<string, MeshNode>();
  private sockets = new Map<string, any>();
  private messageHandlers: Map<string, (msg: MeshMessage) => Promise<void>> = new Map();

  registerNode(id: string, socket: any, info: Partial<MeshNode>) {
    const existing = this.nodes.get(id);
    this.nodes.set(id, {
      id,
      name: info.name || id,
      address: info.address || 'unknown',
      connectedAt: existing?.connectedAt || new Date(),
      lastSeen: new Date(),
      capabilities: info.capabilities || [],
      agentId: info.agentId,
      metadata: info.metadata,
    });
    this.sockets.set(id, socket);
    this.logger.log(`Mesh node registered: ${id} (${info.name})`);
    return this.nodes.get(id)!;
  }

  unregisterNode(id: string) {
    this.nodes.delete(id);
    this.sockets.delete(id);
    this.logger.log(`Mesh node unregistered: ${id}`);
  }

  updateHeartbeat(id: string) {
    const node = this.nodes.get(id);
    if (node) {
      node.lastSeen = new Date();
      return true;
    }
    return false;
  }

  getNode(id: string): MeshNode | undefined {
    return this.nodes.get(id);
  }

  getNodes(): MeshNode[] {
    return Array.from(this.nodes.values());
  }

  getConnectedCount(): number {
    return this.nodes.size;
  }

  sendToNode(to: string, message: Omit<MeshMessage, 'timestamp'>): boolean {
    const socket = this.sockets.get(to);
    if (!socket) {
      this.logger.warn(`Cannot send to ${to}: not connected`);
      return false;
    }
    try {
      socket.emit('mesh:message', { ...message, timestamp: new Date() });
      return true;
    } catch (err) {
      this.logger.warn(`Failed to send to ${to}: ${(err as Error).message}`);
      return false;
    }
  }

  broadcast(message: Omit<MeshMessage, 'timestamp'>, excludeId?: string) {
    const msg = { ...message, timestamp: new Date() };
    for (const [id, socket] of this.sockets) {
      if (id === excludeId) continue;
      try { socket.emit('mesh:message', msg); } catch {}
    }
  }

  onMessage(type: string, handler: (msg: MeshMessage) => Promise<void>) {
    this.messageHandlers.set(type, handler);
  }

  async handleMessage(msg: MeshMessage) {
    const handler = this.messageHandlers.get(msg.type);
    if (handler) {
      await handler(msg);
    }
    // Route to specific node if needed
    if (msg.to && msg.to !== 'broadcast') {
      this.sendToNode(msg.to, msg);
    }
  }

  getSocket(id: string): any {
    return this.sockets.get(id);
  }
}
