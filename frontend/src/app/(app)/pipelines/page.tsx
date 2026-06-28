'use client';
import { Spinner } from '@/components/Spinner';
import { AppAlert } from '@/lib/alert';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, RefreshCw, GitCommit, Play, Trash2, Save, Copy } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function PipelinesPage() {
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchPipelines();
    fetchTemplates();
  }, []);

  async function fetchPipelines() {
    setLoading(true);
    try {
      const data = await api.pipelines.list();
      setPipelines(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTemplates() {
    try {
      const data = await api.pipelines.getTemplates();
      setTemplates(data as any[]);
    } catch { /* ignore */ }
  }

  async function handleSaveTemplate(pipeline: any) {
    const name = await AppAlert.prompt('Template name:', pipeline.name);
    if (!name) return;
    try {
      await api.pipelines.saveAsTemplate(pipeline.id, name);
      AppAlert.success('Saved as template');
      fetchTemplates();
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  async function handleCreateFromTemplate(template: any) {
    const name = await AppAlert.prompt('New pipeline name:', `${template.name} (copy)`);
    if (!name) return;
    try {
      const created = await api.pipelines.createFromTemplate(template.id, name);
      AppAlert.success('Pipeline created from template');
      router.push(`/pipelines/${(created as any).id}`);
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-white">Pipelines</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Multi-step agent workflows</p>
        </div>
        <div className="flex gap-2">
          {templates.length > 0 && (
            <Button variant="secondary" onClick={() => setShowTemplates(!showTemplates)}>
              <Copy size={14} className="mr-1" /> From Template ({templates.length})
            </Button>
          )}
          <Button variant="secondary" onClick={fetchPipelines}><RefreshCw size={14} /></Button>
          <Button onClick={() => router.push('/pipelines/new')}>
            <Plus size={14} className="mr-1" /> New Pipeline
          </Button>
        </div>
      </div>

      {showTemplates && templates.length > 0 && (
        <Card className="bg-zinc-950 border-zinc-700">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm text-zinc-400 font-medium mb-2">Templates</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleCreateFromTemplate(t)}
                  className="text-left p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-purple-600 transition-colors"
                >
                  <p className="text-sm text-white truncate">{t.name}</p>
                  <p className="text-xs text-zinc-500 mt-1">{t.totalSteps || 0} steps</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Spinner />
      ) : pipelines.length === 0 ? (
        <Card className="border-dashed border-2 border-zinc-800 bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <GitCommit className="text-zinc-700 w-12 h-12 mb-4" />
            <p className="text-zinc-400 mb-2">No pipelines created yet</p>
            <p className="text-sm text-zinc-500 max-w-md">
              Create your first pipeline to start chaining agents together.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pipelines.filter(p => !p.isTemplate).map(p => (
            <div key={p.id} className="cursor-pointer" onClick={() => router.push(`/pipelines/${p.id}`)}>
              <Card className="hover:border-zinc-500 transition-colors bg-zinc-950 border-zinc-800 h-full">
              <CardContent className="p-5 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-white truncate">{p.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${p.status === 'running' ? 'bg-blue-900/50 text-blue-400' : p.status === 'completed' ? 'bg-green-900/50 text-green-400' : 'bg-zinc-800 text-zinc-400'}`}>
                    {p.status}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 line-clamp-2">{p.description}</p>
                <div className="text-xs flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/50">
                  <span className="text-zinc-400">{p.totalSteps || 0} Steps</span>
                  <div className="flex items-center gap-1">
                    <button onClick={async (e) => {
                      e.stopPropagation();
                      await handleSaveTemplate(p);
                    }} className="p-1.5 text-zinc-600 hover:text-purple-400 transition-colors" title="Save as template">
                      <Save size={14} />
                    </button>
                    <button onClick={async (e) => {
                      e.stopPropagation();
                      const confirmed = await AppAlert.confirm(`Delete pipeline "${p.name}"?`);
                      if (!confirmed) return;
                      try { await api.pipelines.delete(p.id); fetchPipelines(); }
                      catch (err) { AppAlert.error((err as Error).message); }
                    }} className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
