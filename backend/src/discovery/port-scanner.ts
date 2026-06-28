import { Injectable, Logger } from '@nestjs/common';
import * as net from 'net';

export interface ScanResult {
  host: string;
  port: number;
  open: boolean;
  latencyMs?: number;
}

@Injectable()
export class PortScanner {
  private readonly logger = new Logger(PortScanner.name);

  async scanPort(host: string, port: number, timeoutMs = 1000): Promise<ScanResult> {
    return new Promise((resolve) => {
      const start = Date.now();
      const socket = new net.Socket();

      socket.setTimeout(timeoutMs);

      socket.on('connect', () => {
        const latencyMs = Date.now() - start;
        socket.destroy();
        resolve({ host, port, open: true, latencyMs });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ host, port, open: false });
      });

      socket.on('error', () => {
        resolve({ host, port, open: false });
      });

      socket.connect(port, host);
    });
  }

  async scanRange(
    host: string,
    ports: number[],
    timeoutMs = 1000,
    concurrency = 20,
  ): Promise<ScanResult[]> {
    const results: ScanResult[] = [];

    for (let i = 0; i < ports.length; i += concurrency) {
      const batch = ports.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((port) => this.scanPort(host, port, timeoutMs)),
      );
      results.push(...batchResults);
    }

    return results;
  }

  async scanCommonAgentPorts(host = '127.0.0.1'): Promise<ScanResult[]> {
    // Use SCAN_PORTS from env, or fallback to common AI agent ports
    const envPorts = process.env.SCAN_PORTS;
    const ports = envPorts
      ? envPorts.split(',').map((p) => parseInt(p.trim(), 10)).filter((p) => !isNaN(p))
      : [11434, 8080, 8000, 3000, 5000, 7860, 1234, 8888];

    const results = await this.scanRange(host, ports, 500);
    return results.filter((r) => r.open);
  }
}
