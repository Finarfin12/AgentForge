import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createSocket, Socket } from 'dgram';
import { networkInterfaces } from 'os';

const SSDP_MULTICAST = '239.255.255.250';
const SSDP_PORT = 1900;
const SERVICE_TYPE = 'urn:schemas-agentforge-org:service:orchestrator:1';

export interface LanPeer {
  id: string;
  host: string;
  port: number;
  name: string;
  via: 'mDNS' | 'SSDP';
  lastSeen: Date;
  metadata?: Record<string, string>;
}

@Injectable()
export class LanDiscoveryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LanDiscoveryService.name);
  private bonjour: any;
  private ssdpSocket: Socket | null = null;
  private peers = new Map<string, LanPeer>();
  private advertiseTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {}

  async onModuleInit() {
    await this.startBonjour();
    await this.startSSDP();
    this.advertiseTimer = setInterval(() => this.advertiseSSDP(), 30000);
    this.advertiseSSDP();
    this.logger.log('LAN discovery started (mDNS + SSDP)');
  }

  async onModuleDestroy() {
    if (this.advertiseTimer) clearInterval(this.advertiseTimer);
    if (this.bonjour) { try { this.bonjour.destroy(); } catch {} }
    if (this.ssdpSocket) { try { this.ssdpSocket.close(); } catch {} }
  }

  getPeers(): LanPeer[] {
    return Array.from(this.peers.values());
  }

  private async startBonjour() {
    try {
      const Bonjour = require('bonjour-service');
      this.bonjour = new Bonjour.default();
      const hostname = require('os').hostname();
      const serviceName = `AgentForge-${hostname}-${process.env.PORT || '3002'}`;
      this.bonjour.publish({ name: serviceName, type: 'agentforge', port: parseInt(process.env.PORT || '3002', 10) });
      this.bonjour.find({ type: 'agentforge' }, (service: any) => {
        if (!service || !service.host) return;
        const id = `${service.host}:${service.port}`;
        if (!this.peers.has(id)) {
          this.peers.set(id, { id, host: service.host, port: service.port, name: service.name || id, via: 'mDNS', lastSeen: new Date() });
          this.logger.log(`mDNS peer found: ${service.name} @ ${service.host}:${service.port}`);
        } else {
          this.peers.get(id)!.lastSeen = new Date();
        }
      });
    } catch (err) {
      this.logger.warn(`Bonjour/mDNS not available: ${(err as Error).message}`);
    }
  }

  private async startSSDP() {
    try {
      this.ssdpSocket = createSocket({ type: 'udp4', reuseAddr: true });
      this.ssdpSocket.on('message', (msg, rinfo) => this.handleSSDPMessage(msg, rinfo));
      this.ssdpSocket.on('error', (err) => this.logger.warn(`SSDP socket error: ${err.message}`));
      this.ssdpSocket.bind(SSDP_PORT, () => {
        this.ssdpSocket!.addMembership(SSDP_MULTICAST);
        this.ssdpSocket!.setMulticastTTL(4);
        this.discoverSSDP();
      });
    } catch (err) {
      this.logger.warn(`SSDP not available: ${(err as Error).message}`);
    }
  }

  private discoverSSDP() {
    if (!this.ssdpSocket) return;
    const msg = Buffer.from(
      `M-SEARCH * HTTP/1.1\r\nHOST: ${SSDP_MULTICAST}:${SSDP_PORT}\r\nMAN: "ssdp:discover"\r\nMX: 3\r\nST: ${SERVICE_TYPE}\r\n\r\n`
    );
    this.ssdpSocket.send(msg, 0, msg.length, SSDP_PORT, SSDP_MULTICAST);
  }

  private advertiseSSDP() {
    if (!this.ssdpSocket) return;
    const interfaces = networkInterfaces();
    for (const iface of Object.values(interfaces)) {
      if (!iface) continue;
      for (const addr of iface) {
        if (addr.family === 'IPv4' && !addr.internal) {
          const msg = Buffer.from(
            `NOTIFY * HTTP/1.1\r\nHOST: ${SSDP_MULTICAST}:${SSDP_PORT}\r\nNT: ${SERVICE_TYPE}\r\nNTS: ssdp:alive\r\nUSN: uuid:agentforge-orchestrator\r\nLOCATION: http://${addr.address}:${process.env.PORT || 3002}\r\n\r\n`
          );
          this.ssdpSocket.send(msg, 0, msg.length, SSDP_PORT, SSDP_MULTICAST);
        }
      }
    }
  }

  private handleSSDPMessage(msg: Buffer, rinfo: { address: string; port: number }) {
    const text = msg.toString();
    if (text.includes(SERVICE_TYPE) || text.includes('agentforge')) {
      const host = rinfo.address;
      const port = parseInt(process.env.PORT || '3002', 10);
      const id = `${host}:${port}`;
      if (!this.peers.has(id)) {
        this.peers.set(id, { id, host, port: rinfo.port, name: `SSDP Peer @ ${host}`, via: 'SSDP', lastSeen: new Date() });
        this.logger.log(`SSDP peer found @ ${host}:${rinfo.port}`);
      } else {
        this.peers.get(id)!.lastSeen = new Date();
      }
    }
  }
}
