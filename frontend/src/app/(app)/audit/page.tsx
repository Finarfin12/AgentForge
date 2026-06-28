'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/Spinner';
import { RefreshCw, Shield, Activity, User, Bot, ListTodo, Workflow, MessageSquare, Puzzle } from 'lucide-react';
import { timeAgo } from '@/lib/utils';

const entityIcons: Record<string, any> = {
  'audit:user': User,
  'audit:agent': Bot,
  'audit:task': ListTodo,
  'audit:pipeline': Workflow,
  'audit:thread': MessageSquare,
  'audit:integration': Puzzle,
};

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAudit();
  }, []);

  async function fetchAudit() {
    try {
      const data = await api.logs.list({ page: 1, limit: 200 });
      const auditEntries = ((data.data ?? []) as any[]).filter(l => l.source?.startsWith('audit:'));
      setLogs(auditEntries);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-6"><Spinner /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Shield size={20} className="text-purple-400" /> Audit Trail
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Recorded user actions across the system</p>
        </div>
        <Button variant="secondary" onClick={fetchAudit}><RefreshCw size={14} /></Button>
      </div>

      <Card className="bg-zinc-950 border-zinc-800">
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">No audit entries yet.</div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {logs.map((entry) => {
                const Icon = entityIcons[entry.source] || Activity;
                return (
                  <div key={entry.id} className="flex items-start gap-3 p-4 hover:bg-zinc-900/30">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <Icon size={14} className="text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{entry.message}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {entry.source?.replace('audit:', '')} · {timeAgo(entry.createdAt)}
                      </p>
                    </div>
                    <span className="text-xs text-zinc-600 shrink-0">
                      {new Date(entry.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
