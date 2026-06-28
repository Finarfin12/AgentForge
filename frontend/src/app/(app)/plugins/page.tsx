'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppAlert } from '@/lib/alert';
import { Puzzle, RefreshCw, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.plugins.list();
      setPlugins((res as any).plugins || []);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleToggle(name: string, enabled: boolean) {
    try {
      await api.plugins.toggle(name, enabled);
      await load();
    } catch (err) { AppAlert.error((err as Error).message); }
  }

  async function handleReload(name: string) {
    try {
      await api.plugins.reload(name);
      await load();
      AppAlert.success(`Plugin "${name}" reloaded`);
    } catch (err) { AppAlert.error((err as Error).message); }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Puzzle size={18} /> Plugins
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Manage extension plugins</p>
        </div>
        <Button variant="secondary" onClick={load} loading={loading}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {plugins.length === 0 && !loading ? (
        <p className="text-sm text-zinc-400 text-center py-8">No plugins found. Add plugins to the <code className="text-zinc-300">plugins/</code> directory.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {plugins.map((p: any) => (
            <Card key={p.name} className={`bg-zinc-950 border-zinc-800 ${!p.enabled ? 'opacity-60' : ''}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {p.name}
                      {p.error && <AlertCircle size={12} className="text-red-400" />}
                    </CardTitle>
                    <p className="text-xs text-zinc-500">v{p.version}{p.author ? ` by ${p.author}` : ''}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleToggle(p.name, !p.enabled)}>
                    {p.enabled ? <ToggleRight size={16} className="text-green-400" /> : <ToggleLeft size={16} className="text-zinc-500" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-zinc-400">{p.description}</p>
                {p.error && <p className="text-xs text-red-400 bg-red-950/50 rounded px-2 py-1">{p.error}</p>}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-600">Hooks: {p.hooks.join(', ') || 'none'}</span>
                  <Button size="sm" variant="ghost" onClick={() => handleReload(p.name)}>
                    <RefreshCw size={10} />
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
