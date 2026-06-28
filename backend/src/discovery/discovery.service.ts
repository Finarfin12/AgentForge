import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PortScanner, ScanResult } from './port-scanner';

const execAsync = promisify(exec);

export interface DiscoveredAgent {
  host: string;
  port: number;
  type: string;
  name: string;
  healthy: boolean;
  latencyMs?: number;
  models?: string[];
  detectedAt: Date;
}

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);
  private readonly discovered = new Map<string, DiscoveredAgent>();

  constructor(private portScanner: PortScanner) {}

  async discoverLocal(): Promise<DiscoveredAgent[]> {
    this.logger.log('Starting local agent discovery...');
    const agents: DiscoveredAgent[] = [];

    // Scan network ports (Ollama, LM Studio, etc.)
    const openPorts = await this.portScanner.scanCommonAgentPorts('127.0.0.1');
    for (const result of openPorts) {
      const agent = await this.probeAgent(result);
      if (agent) {
        agents.push(agent);
        this.discovered.set(`${result.host}:${result.port}`, agent);
      }
    }

    // Detect CLI-based agents
    const cliAgents = await this.discoverCliAgents();
    agents.push(...cliAgents);

    this.logger.log(`Discovered ${agents.length} agents (${openPorts.length} network + ${cliAgents.length} CLI)`);
    return agents;
  }

  async discoverHost(host: string, ports?: number[]): Promise<DiscoveredAgent[]> {
    const portsToScan = ports ?? [11434, 8080, 8000, 3000, 5000, 7860, 1234];
    const results = await this.portScanner.scanRange(host, portsToScan, 1000);
    const open = results.filter((r) => r.open);

    const agents: DiscoveredAgent[] = [];
    for (const result of open) {
      const agent = await this.probeAgent(result);
      if (agent) {
        agents.push(agent);
        this.discovered.set(`${host}:${result.port}`, agent);
      }
    }
    return agents;
  }

  async discoverCliAgents(): Promise<DiscoveredAgent[]> {
    const agents: DiscoveredAgent[] = [];
    const now = new Date();

    const cliChecks = [
      { cmd: 'hermes', label: 'Hermes' },
      { cmd: 'opencode', label: 'OpenCode' },
      { cmd: 'commandcode', label: 'CommandCode' },
      { cmd: 'freebuff', label: 'FreeBuff' },
      { cmd: 'antigravity', label: 'AntiGravity' },
      { cmd: 'codex', label: 'Codex' },
    ];

    for (const cli of cliChecks) {
      try {
        const { stdout } = await execAsync(`${cli.cmd} --version`, { timeout: 5000 });
        const firstLine = stdout.trim().split('\n')[0].trim();
        const version = firstLine || 'detected';
        agents.push({
          host: 'localhost',
          port: -1,
          type: 'cli',
          name: `${cli.label} CLI ${version}`,
          healthy: true,
          models: [cli.cmd],
          detectedAt: now,
        });
        this.discovered.set(`cli:${cli.cmd}`, agents[agents.length - 1]);
        this.logger.log(`Detected CLI agent: ${cli.cmd} (${version})`);
      } catch (err) {
        this.logger.warn(`${cli.cmd} CLI not found: ${(err as Error).message}`);
      }
    }

    return agents;
  }

  getDiscovered(): DiscoveredAgent[] {
    return Array.from(this.discovered.values());
  }

  private async probeAgent(scan: ScanResult): Promise<DiscoveredAgent | null> {
    const { host, port, latencyMs } = scan;
    const base = `http://${host}:${port}`;

    // Probe Ollama
    try {
      const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(1000) });
      if (res.ok) {
        const data = (await res.json()) as any;
        return {
          host, port, type: 'ollama', name: `Ollama @ ${host}:${port}`,
          healthy: true, latencyMs, detectedAt: new Date(),
          models: data.models?.map((m: any) => m.name) ?? [],
        };
      }
    } catch { /* not ollama */ }

    // Probe OpenAI-compatible
    try {
      const res = await fetch(`${base}/v1/models`, { signal: AbortSignal.timeout(1000) });
      if (res.ok) {
        const data = (await res.json()) as any;
        return {
          host, port, type: 'openai-compatible', name: `OpenAI-compat @ ${host}:${port}`,
          healthy: true, latencyMs, detectedAt: new Date(),
          models: data.data?.map((m: any) => m.id) ?? [],
        };
      }
    } catch { /* not openai-compat */ }

    // Probe HuggingFace TGI / vLLM health
    try {
      const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(1000) });
      if (res.ok) {
        return {
          host, port, type: 'tgi', name: `TGI/vLLM @ ${host}:${port}`,
          healthy: true, latencyMs, detectedAt: new Date(),
        };
      }
    } catch { /* not tgi */ }

    // Probe LM Studio
    try {
      const res = await fetch(`${base}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: '', messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok || res.status === 401 || res.status === 400) {
        const data = (await res.json().catch(() => ({}))) as any;
        return {
          host, port, type: 'lm-studio', name: `LM Studio @ ${host}:${port}`,
          healthy: true, latencyMs, detectedAt: new Date(),
          models: data.model ? [data.model] : [],
        };
      }
    } catch { /* not lm-studio */ }

    return null;
  }
}
