'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/Spinner';
import { AppAlert } from '@/lib/alert';
import { ArrowLeft, RefreshCw, RotateCcw, User, Calendar, FileText, AlertCircle, CheckCircle2, Clock, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-600',
  assigned: 'bg-blue-600',
  running: 'bg-purple-600 animate-pulse',
  completed: 'bg-green-600',
  failed: 'bg-red-600',
  cancelled: 'bg-zinc-600',
};

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [task, setTask] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchTask();
    api.agents.list({ isActive: true }).then(setAgents).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (task?.status === 'running' || task?.status === 'pending' || task?.status === 'assigned') {
      const interval = setInterval(fetchTask, 3000);
      return () => clearInterval(interval);
    }
  }, [task?.status]);

  async function fetchTask() {
    try {
      const data = await api.tasks.get(id);
      setTask(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRetry() {
    try {
      await api.tasks.retry(id);
      AppAlert.success('Task re-enqueued for processing');
      fetchTask();
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  async function handleAssign(agentId: string) {
    setAssigning(true);
    try {
      await api.tasks.assign(id, agentId);
      AppAlert.success('Agent assigned');
      fetchTask();
    } catch (err) {
      AppAlert.error((err as Error).message);
    } finally {
      setAssigning(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;
  if (!task) return <div className="p-8 text-center text-zinc-400">Task not found.</div>;

  const outputText = task.output?.result || task.output?.data || '';
  const errorText = task.error?.message || '';

  const agentName = task.assignedAgentId
    ? agents.find(a => a.id === task.assignedAgentId)?.name || task.assignedAgentId?.slice(0, 8)
    : 'Unassigned';

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Button variant="ghost" onClick={() => router.push('/tasks')} className="mb-2">
        <ArrowLeft size={16} className="mr-2" /> Back to Tasks
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white">{task.title}</h1>
            <Badge className={`${statusColors[task.status] || 'bg-zinc-600'} text-white`}>
              {task.status}
            </Badge>
          </div>
          {task.description && (
            <p className="text-zinc-400 text-sm max-w-2xl">{task.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(task.createdAt).toLocaleString()}</span>
            <span className="flex items-center gap-1"><User size={12} /> {agentName}</span>
            {task.priority > 0 && <span className="flex items-center gap-1"><AlertCircle size={12} /> Priority: {task.priority}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={fetchTask}>
            <RefreshCw size={14} className="mr-1" /> Refresh
          </Button>
          {task.status === 'failed' && (
            <Button size="sm" onClick={handleRetry} className="bg-amber-600 hover:bg-amber-700">
              <RotateCcw size={14} className="mr-1" /> Retry
            </Button>
          )}
        </div>
      </div>

      {(task.status === 'pending' || task.status === 'assigned' || task.status === 'failed') && (
        <Card className="bg-zinc-900 border-zinc-700">
          <CardContent className="p-4">
            <label className="text-sm font-medium text-zinc-300 mb-2 block">Assign Agent</label>
            <div className="flex gap-2">
              <select
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200"
                value={task.assignedAgentId || ''}
                onChange={e => handleAssign(e.target.value)}
                disabled={assigning}
              >
                <option value="">Select an agent...</option>
                {agents.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.displayName || a.name}</option>
                ))}
              </select>
              {assigning && <Spinner />}
            </div>
          </CardContent>
        </Card>
      )}

      {(task.description || task.input) && (
        <Card className="bg-zinc-900 border-zinc-700">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-300 flex items-center gap-2"><Send size={14} /> Input</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-zinc-400 whitespace-pre-wrap">{task.description || JSON.stringify(task.input, null, 2)}</p>
          </CardContent>
        </Card>
      )}

      {outputText && (
        <Card className="bg-zinc-900 border-zinc-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-400 flex items-center gap-2">
              <CheckCircle2 size={14} /> Output
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="prose prose-invert prose-zinc max-w-none text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{outputText}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {errorText && (
        <Card className="bg-zinc-900 border-red-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-400 flex items-center gap-2">
              <AlertCircle size={14} /> Error
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-red-300 font-mono whitespace-pre-wrap">{errorText}</p>
          </CardContent>
        </Card>
      )}

      {task.metadata && Object.keys(task.metadata).length > 0 && (
        <Card className="bg-zinc-900 border-zinc-700">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-300 flex items-center gap-2"><FileText size={14} /> Metadata</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <pre className="text-xs text-zinc-500 font-mono">{JSON.stringify(task.metadata, null, 2)}</pre>
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-zinc-600 flex gap-4">
        <span>Created: {new Date(task.createdAt).toLocaleString()}</span>
        {task.updatedAt && <span>Updated: {new Date(task.updatedAt).toLocaleString()}</span>}
      </div>
    </div>
  );
}
