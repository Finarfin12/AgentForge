'use client';
import { Spinner } from '@/components/Spinner';
import { AppAlert } from '@/lib/alert';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAgentStore, useTaskStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { taskStatusBadge, formatDate } from '@/lib/utils';
import { Plus, X, Ban, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { Agent, Task } from '@/lib/types';

export default function TasksPage() {
  const { agents, setAgents } = useAgentStore();
  const { tasks, setTasks, updateTask } = useTaskStore();
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({ title: '', description: '', priority: '0', assignedAgentId: '' });

  useEffect(() => {
    Promise.all([
      api.agents.list().then((r) => setAgents(r as Agent[])).catch(() => []),
      api.tasks.list().then((r) => setTasks(r as Task[])).catch(() => []),
    ]).finally(() => setLoading(false));
  }, [setAgents, setTasks]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const task = await api.tasks.create({
        title: form.title,
        description: form.description,
        priority: parseInt(form.priority),
        assignedAgentId: form.assignedAgentId || undefined,
      });
      setTasks([task as Task, ...tasks]);
      setShowCreate(false);
      setForm({ title: '', description: '', priority: '0', assignedAgentId: '' });
    } catch (err) {
      AppAlert.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function handleCancel(id: string) {
    const confirmed = await AppAlert.confirm('Cancel this task?');
    if (!confirmed) return;
    try {
      const updated = await api.tasks.cancel(id);
      updateTask(id, updated as Partial<Task>);
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  const filtered = statusFilter ? tasks.filter((t) => t.status === statusFilter) : tasks;
  const statuses = ['pending', 'assigned', 'running', 'completed', 'failed', 'cancelled'];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Tasks</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{tasks.length} total</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={14} /> New Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!statusFilter ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}
        >
          All ({tasks.length})
        </button>
        {statuses.map((s) => {
          const count = tasks.filter((t) => t.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s === statusFilter ? '' : s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              {s} ({count})
            </button>
          );
        })}
      </div>

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>New Task</CardTitle>
              <button onClick={() => setShowCreate(false)} className="text-zinc-500 hover:text-white"><X size={16} /></button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-3">
              <Input label="Title" placeholder="Describe the task..." value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <Textarea label="Description" placeholder="Additional context..." rows={3}
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Priority (0=low, 10=high)" type="number" min="0" max="10"
                  value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-400">Assign to Agent</label>
                  <select
                    value={form.assignedAgentId}
                    onChange={(e) => setForm({ ...form, assignedAgentId: e.target.value })}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                  >
                    <option value="">— Unassigned —</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>{a.displayName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" loading={creating}>Create Task</Button>
                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Task list */}
      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-zinc-500">No tasks found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const assignedAgent = agents.find((a) => a.id === t.assignedAgentId);
            return (
              <Card key={t.id}>
                <CardContent className="py-3 flex items-center gap-4">
                  <Link href={`/tasks/${t.id}`} className="flex-1 min-w-0 group">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate group-hover:text-emerald-400 transition-colors">{t.title}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${taskStatusBadge(t.status)}`}>
                        {t.status}
                      </span>
                      {t.priority > 5 && (
                        <span className="text-xs bg-orange-900/50 text-orange-300 px-1.5 py-0.5 rounded">p{t.priority}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-500">
                      {assignedAgent && <span>{assignedAgent.displayName}</span>}
                      <span>{formatDate(t.createdAt)}</span>
                    </div>
                  </Link>
                  <ArrowRight size={14} className="text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                  {['pending', 'assigned', 'running'].includes(t.status) && (
                    <Button size="sm" variant="danger" onClick={(e) => { e.preventDefault(); handleCancel(t.id); }}>
                      <Ban size={12} /> Cancel
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
