'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppAlert } from '@/lib/alert';
import { Cpu, Plus, Trash2, Zap, Wifi, WifiOff } from 'lucide-react';

export default function RuntimesPage() {
  const [runtimes, setRuntimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    api.runtimes.list().then(setRuntimes).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleDetect() {
    setDetecting(true);
    try {
      const clis = await api.runtimes.detect();
      let count = 0;
      for (const cli of clis) {
        try {
          await api.runtimes.register({
            name: `CLI ${cli.name}`,
            provider: cli.provider,
            mode: 'local',
            daemonId: `cli-${cli.provider}`,
            deviceName: cli.path,
            version: cli.version,
            metadata: { detectedPath: cli.path, autoDetected: true },
          });
          count++;
        } catch {}
      }
      const updated = await api.runtimes.list();
      setRuntimes(updated as any[]);
      AppAlert.success(`Detected ${clis.length} CLI(s), registered ${count} new runtime(s)`);
    } catch (err) {
      AppAlert.error((err as Error).message);
    } finally {
      setDetecting(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = await AppAlert.confirm('Delete this runtime?');
    if (!confirmed) return;
    try {
      await api.runtimes.delete(id);
      setRuntimes(runtimes.filter(r => r.id !== id));
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Runtimes</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{runtimes.length} registered runtimes</p>
        </div>
        <Button onClick={handleDetect} loading={detecting}>
          <Zap size={14} className="mr-1.5" /> Auto-Detect CLIs
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : runtimes.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800/50">
            <Cpu size={28} className="text-zinc-600" />
          </div>
          <div>
            <p className="text-sm text-zinc-400">No runtimes registered yet.</p>
            <p className="text-xs text-zinc-600 mt-1">Click "Auto-Detect CLIs" to scan your PATH for installed coding agents.</p>
          </div>
          <Button onClick={handleDetect} loading={detecting}>
            <Zap size={14} className="mr-1.5" /> Auto-Detect CLIs
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {runtimes.map((rt) => (
            <Card key={rt.id} className="bg-zinc-950 border-zinc-800">
              <CardContent className="py-4 space-y-3">
                <div className="flex items-start gap-3">
                  {rt.status === 'online' ? <Wifi size={16} className="text-green-400 mt-1" /> : <WifiOff size={16} className="text-zinc-600 mt-1" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{rt.name}</p>
                    <p className="text-xs text-zinc-500 font-mono">{rt.provider}</p>
                  </div>
                  <Badge className={rt.status === 'online' ? 'bg-green-900/40 text-green-300' : 'bg-zinc-800 text-zinc-500'}>
                    {rt.status}
                  </Badge>
                </div>
                <div className="text-xs text-zinc-500 space-y-1">
                  <p className="flex justify-between"><span>Mode:</span> <span className="text-zinc-400">{rt.mode}</span></p>
                  {rt.deviceName && <p className="flex justify-between"><span>Device:</span> <span className="text-zinc-400 truncate max-w-[180px]">{rt.deviceName}</span></p>}
                  {rt.version && <p className="flex justify-between"><span>Version:</span> <span className="text-zinc-400">{rt.version}</span></p>}
                  <p className="flex justify-between"><span>Last seen:</span> <span className="text-zinc-400">{rt.lastSeenAt ? new Date(rt.lastSeenAt).toLocaleString() : 'Never'}</span></p>
                </div>
                <div className="flex gap-2 pt-1 border-t border-zinc-800">
                  <Button size="sm" variant="danger" onClick={() => handleDelete(rt.id)}>
                    <Trash2 size={12} /> Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
