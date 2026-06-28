'use client';
import { AppAlert } from '@/lib/alert';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Radar, Wifi, WifiOff, Clock } from 'lucide-react';
import type { DiscoveredAgent } from '@/lib/types';

export default function DiscoveryPage() {
  const [agents, setAgents] = useState<DiscoveredAgent[]>([]);
  const [scanning, setScanning] = useState(false);
  const [host, setHost] = useState('');
  const [ports, setPorts] = useState('');

  useEffect(() => {
    api.discovery.list()
      .then((r) => setAgents((r as any).agents || []))
      .catch(() => {});
  }, []);

  async function scanLocal() {
    setScanning(true);
    try {
      const result = await api.discovery.scanLocal();
      setAgents(result as DiscoveredAgent[]);
    } catch (err) {
      AppAlert.error((err as Error).message);
    } finally {
      setScanning(false);
    }
  }

  async function scanHost(e: React.FormEvent) {
    e.preventDefault();
    if (!host) return;
    setScanning(true);
    try {
      const portList = ports ? ports.split(',').map((p) => parseInt(p.trim())) : undefined;
      const result = await api.discovery.scanHost(host, portList);
      setAgents(result as DiscoveredAgent[]);
    } catch (err) {
      AppAlert.error((err as Error).message);
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Discovery</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Scan for local AI agents and LLM servers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Local scan */}
        <Card>
          <CardHeader><CardTitle>Local Scan</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-zinc-400">
              Scans common ports on localhost for Ollama, LM Studio, vLLM, and other OpenAI-compatible servers.
            </p>
            <Button onClick={scanLocal} loading={scanning}>
              <Radar size={14} /> Scan Localhost
            </Button>
          </CardContent>
        </Card>

        {/* Host scan */}
        <Card>
          <CardHeader><CardTitle>Scan Host</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={scanHost} className="space-y-3">
              <Input label="Host" placeholder="192.168.1.100" value={host}
                onChange={(e) => setHost(e.target.value)} required />
              <Input label="Ports (optional, comma-separated)" placeholder="11434,8080,8000"
                value={ports} onChange={(e) => setPorts(e.target.value)} />
              <Button type="submit" loading={scanning}>
                <Radar size={14} /> Scan Host
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {agents.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-zinc-400 mb-3">Found {agents.length} agent(s)</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {agents.map((a, i) => {
              const isCli = a.type === 'cli' || a.port < 0;
              return (
              <Card key={i} className="flex flex-col">
                <CardContent className="py-4 space-y-3 flex-grow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {a.healthy ? (
                        <Wifi size={16} className="text-green-400" />
                      ) : (
                        <WifiOff size={16} className="text-red-400" />
                      )}
                      <p className="text-sm font-medium text-white">{a.name}</p>
                    </div>
                    {a.healthy && (
                      <Button size="sm" variant="secondary" className="h-7 text-xs px-2" onClick={async () => {
                        try {
                          const rawSlug = `local_${a.type}_${isCli ? (a.models?.[0] || 'cli') : a.port}`;
                          const slug = rawSlug.length > 95 ? rawSlug.slice(0, 95) : rawSlug;
                          const config: Record<string, unknown> = {
                            model: a.models?.[0] || 'default',
                            temperature: 0.7,
                            maxTokens: 4096,
                            provider: a.type,
                          };
                          if (!isCli) {
                            config.apiEndpoint = `http://${a.host}:${a.port}`;
                          }
                          await api.agents.create({
                            name: slug,
                            displayName: isCli ? a.name : `Local ${a.name}`,
                            description: isCli ? `CLI-based agent: ${a.name}` : `Auto-discovered ${a.type} server running locally`,
                            config,
                            capabilities: ['agentic-coding'],
                          });
                          AppAlert.success('Agent added successfully!');
                          window.location.href = '/agents';
                        } catch(err) {
                          AppAlert.error('Failed to add agent: ' + (err as Error).message);
                        }
                      }}>
                        + Add Agent
                      </Button>
                    )}
                  </div>
                  <div className="text-xs text-zinc-400 space-y-1">
                    <p><span className="text-zinc-600">{isCli ? 'Binary:' : 'Host:'}</span> {isCli ? a.name : `${a.host}:${a.port}`}</p>
                    <p><span className="text-zinc-600">Type:</span> {isCli ? 'CLI (local binary)' : a.type}</p>
                    {!isCli && a.latencyMs !== undefined && (
                      <p className="flex items-center gap-1">
                        <Clock size={11} />
                        {a.latencyMs}ms
                      </p>
                    )}
                  </div>
                  {a.models && a.models.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {a.models.slice(0, 3).map((m) => (
                        <span key={m} className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded truncate max-w-[120px]">{m}</span>
                      ))}
                      {a.models.length > 3 && (
                        <span className="text-xs text-zinc-600">+{a.models.length - 3} more</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )})}
          </div>
        </div>
      )}
    </div>
  );
}
