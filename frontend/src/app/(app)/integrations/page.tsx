'use client';
import { Spinner } from '@/components/Spinner';
import { AppAlert } from '@/lib/alert';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, XCircle, Cpu } from 'lucide-react';

export default function IntegrationsPage() {
  const [providers, setProviders] = useState<string[]>([]);
  const [health, setHealth] = useState<Record<string, boolean>>({});
  const [models, setModels] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    Promise.all([
      api.integrations.listProviders().then((r: any) => setProviders(r.providers)),
      api.integrations.healthCheckAll().then((h: any) => setHealth(h)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  async function checkHealth() {
    setChecking(true);
    try {
      const h = await api.integrations.healthCheckAll();
      setHealth(h as any);
    } catch (err) {
      AppAlert.error((err as Error).message);
    } finally {
      setChecking(false);
    }
  }

  async function loadModels(name: string) {
    try {
      const m = await api.integrations.listModels(name);
      setModels((prev) => ({ ...prev, [name]: m as any }));
    } catch {
      setModels((prev) => ({ ...prev, [name]: [] }));
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Integrations</h1>
          <p className="text-sm text-zinc-500 mt-0.5">AI provider registry</p>
        </div>
        <Button variant="secondary" onClick={checkHealth} loading={checking}>
          <RefreshCw size={14} /> Health Check
        </Button>
      </div>

      {loading ? (
        <Spinner />
      ) : providers.length === 0 ? (
        <p className="text-sm text-zinc-500">No providers registered. Set OPENAI_BASE_URL and OPENAI_API_KEY in backend .env, or start Ollama.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {providers.map((name) => (
            <Card key={name}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu size={16} className="text-zinc-400" />
                    <CardTitle>{name}</CardTitle>
                  </div>
                  {name in health && (
                    health[name]
                      ? <CheckCircle size={16} className="text-green-400" />
                      : <XCircle size={16} className="text-red-400" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button size="sm" variant="secondary" onClick={() => loadModels(name)}>
                  List Models
                </Button>

                {models[name] !== undefined && (
                  <div>
                    {models[name].length === 0 ? (
                      <p className="text-xs text-zinc-500">No models available</p>
                    ) : (
                      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                        {models[name].map((m) => (
                          <span key={m} className="text-xs text-zinc-300 font-mono bg-zinc-800 px-2 py-1 rounded truncate">{m}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
