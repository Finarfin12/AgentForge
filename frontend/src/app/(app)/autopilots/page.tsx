'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AppAlert } from '@/lib/alert';
import { Clock, Plus, Play, Trash2, X, ToggleLeft, ToggleRight, ListTodo, Webhook } from 'lucide-react';

export default function AutopilotsPage() {
  const [autopilots, setAutopilots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', description: '', assigneeId: '', assigneeType: 'agent', executionMode: 'create_task', issueTitleTemplate: '' });
  const [detail, setDetail] = useState<any>(null);
  const [showTriggerForm, setShowTriggerForm] = useState(false);
  const [triggerForm, setTriggerForm] = useState({ kind: 'schedule' as 'schedule' | 'webhook', cronExpression: '', timezone: 'UTC', label: '' });

  useEffect(() => {
    Promise.all([
      api.autopilots.list(),
      api.agents.list({ isActive: true }),
    ]).then(([a, ag]) => {
      setAutopilots(a as any[]);
      setAgents(ag as any[]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.assigneeId) { AppAlert.error('Please select an assignee'); return; }
    setCreating(true);
    try {
      const ap = await api.autopilots.create(form);
      setAutopilots([...autopilots, ap as any]);
      setShowCreate(false);
      setForm({ name: '', description: '', assigneeId: '', assigneeType: 'agent', executionMode: 'create_task', issueTitleTemplate: '' });
      AppAlert.success('Autopilot created');
    } catch (err) {
      AppAlert.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(id: string) {
    try {
      await api.autopilots.toggle(id);
      setAutopilots(autopilots.map(ap => ap.id === id ? { ...ap, status: ap.status === 'active' ? 'paused' : 'active' } : ap));
      if (detail?.id === id) setDetail({ ...detail, status: detail.status === 'active' ? 'paused' : 'active' });
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = await AppAlert.confirm('Delete this autopilot?');
    if (!confirmed) return;
    try {
      await api.autopilots.delete(id);
      setAutopilots(autopilots.filter(ap => ap.id !== id));
      if (detail?.id === id) setDetail(null);
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  async function handleDispatch(id: string) {
    try {
      const result = await api.autopilots.dispatch(id);
      AppAlert.success(`Dispatched: ${(result as any).runId?.slice(0, 8)}`);
      if (detail?.id === id) {
        const updated = await api.autopilots.get(id);
        setDetail(updated as any);
      }
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  function openDetail(ap: any) {
    api.autopilots.get(ap.id).then(setDetail).catch(() => {});
  }

  async function handleAddTrigger() {
    if (!detail) return;
    try {
      await api.autopilots.addTrigger(detail.id, triggerForm);
      const updated = await api.autopilots.get(detail.id);
      setDetail(updated as any);
      setShowTriggerForm(false);
      setTriggerForm({ kind: 'schedule', cronExpression: '', timezone: 'UTC', label: '' });
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  async function handleDeleteTrigger(triggerId: string) {
    try {
      await api.autopilots.deleteTrigger(triggerId);
      const updated = await api.autopilots.get(detail.id);
      setDetail(updated as any);
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  const agentMap = Object.fromEntries(agents.map(a => [a.id, a]));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Autopilots</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{autopilots.length} automations</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus size={14} /> New Autopilot</Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Create Autopilot</CardTitle>
              <button onClick={() => setShowCreate(false)} className="text-zinc-500 hover:text-white"><X size={16} /></button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-3">
              <Input label="Name" placeholder="Daily Standup Report" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Textarea label="Description" rows={2} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Execution Mode</label>
                  <select value={form.executionMode} onChange={(e) => setForm({ ...form, executionMode: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200">
                    <option value="create_task">Create Task</option>
                    <option value="invoke_agent">Direct Invoke</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Assignee Type</label>
                  <select value={form.assigneeType} onChange={(e) => setForm({ ...form, assigneeType: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200">
                    <option value="agent">Agent</option>
                    <option value="squad">Squad</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Assignee</label>
                <select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200">
                  <option value="">Select...</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.displayName} (agent)</option>)}
                </select>
              </div>
              <Input label="Issue Title Template (optional)" placeholder="Scheduled: {{name}}" value={form.issueTitleTemplate}
                onChange={(e) => setForm({ ...form, issueTitleTemplate: e.target.value })} />
              <div className="flex gap-2 pt-1">
                <Button type="submit" loading={creating}>Create</Button>
                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-4">
          {loading ? <p className="text-sm text-zinc-500">Loading...</p> : autopilots.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800/50">
                <Clock size={28} className="text-zinc-600" />
              </div>
              <p className="text-sm text-zinc-400">No autopilots yet. Create one to automate recurring tasks.</p>
              <Button onClick={() => setShowCreate(true)}><Plus size={14} /> Create Autopilot</Button>
            </div>
          ) : (
            autopilots.map((ap) => (
              <Card key={ap.id} className={`bg-zinc-950 border-zinc-800 cursor-pointer hover:border-zinc-600 transition-colors ${detail?.id === ap.id ? 'border-purple-500' : ''}`}
                onClick={() => openDetail(ap)}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-zinc-400" />
                    <div>
                      <p className="text-sm font-medium text-white">{ap.name}</p>
                      <p className="text-xs text-zinc-500">{ap.executionMode} · {ap.triggerCount || 0} triggers</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={ap.status === 'active' ? 'bg-green-900/40 text-green-300' : 'bg-zinc-800 text-zinc-500'}>{ap.status}</Badge>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleToggle(ap.id); }}>
                      {ap.status === 'active' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {detail && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{detail.name}</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleDispatch(detail.id)}><Play size={12} /> Run</Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(detail.id)}><Trash2 size={12} /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-zinc-500">{detail.description || 'No description'}</p>
                <div className="flex justify-between"><span className="text-zinc-500">Assignee:</span><span className="text-zinc-300">{agentMap[detail.assigneeId]?.displayName || detail.assigneeId?.slice(0, 8)} ({detail.assigneeType})</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Mode:</span><span className="text-zinc-300">{detail.executionMode}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Status:</span><Badge className={detail.status === 'active' ? 'bg-green-900/40 text-green-300' : 'bg-zinc-800 text-zinc-500'}>{detail.status}</Badge></div>
                {detail.lastRunAt && <div className="flex justify-between"><span className="text-zinc-500">Last run:</span><span className="text-zinc-300">{new Date(detail.lastRunAt).toLocaleString()}</span></div>}
              </CardContent>
            </Card>

            {/* Triggers */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Triggers</CardTitle>
                  <Button size="sm" variant="secondary" onClick={() => setShowTriggerForm(true)}><Plus size={12} /> Add</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {showTriggerForm && (
                  <div className="bg-zinc-900 rounded-lg p-3 space-y-2">
                    <select value={triggerForm.kind} onChange={e => setTriggerForm({ ...triggerForm, kind: e.target.value as any })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200">
                      <option value="schedule">Schedule (Cron)</option>
                      <option value="webhook">Webhook</option>
                    </select>
                    {triggerForm.kind === 'schedule' && (
                      <>
                        <Input label="Cron Expression" placeholder="0 9 * * 1-5" value={triggerForm.cronExpression} onChange={e => setTriggerForm({ ...triggerForm, cronExpression: e.target.value })} />
                        <Input label="Timezone" placeholder="Asia/Jakarta" value={triggerForm.timezone} onChange={e => setTriggerForm({ ...triggerForm, timezone: e.target.value })} />
                      </>
                    )}
                    <Input label="Label (optional)" placeholder="Weekday morning" value={triggerForm.label} onChange={e => setTriggerForm({ ...triggerForm, label: e.target.value })} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddTrigger}>Add</Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowTriggerForm(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
                {detail.triggers?.length === 0 ? (
                  <p className="text-sm text-zinc-600">No triggers configured</p>
                ) : (
                  detail.triggers?.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between bg-zinc-900 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        {t.kind === 'webhook' ? <Webhook size={12} className="text-zinc-400" /> : <Clock size={12} className="text-zinc-400" />}
                        <div>
                          <p className="text-xs text-zinc-300">{t.label || t.kind}</p>
                          <p className="text-[10px] text-zinc-600">{t.kind === 'schedule' ? t.cronExpression : 'Webhook'}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteTrigger(t.id)}><X size={10} /></Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Recent Runs */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Recent Runs</CardTitle></CardHeader>
              <CardContent>
                {detail.runs?.length === 0 ? (
                  <p className="text-sm text-zinc-600">No runs yet</p>
                ) : (
                  <div className="space-y-1">
                    {detail.runs?.slice(0, 10).map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between text-xs py-1">
                        <div className="flex items-center gap-2">
                          <Badge className={r.status === 'completed' ? 'bg-green-900/40 text-green-300' : r.status === 'failed' ? 'bg-red-900/40 text-red-300' : 'bg-zinc-800 text-zinc-500'}>
                            {r.status}
                          </Badge>
                          <span className="text-zinc-500">{r.source}</span>
                        </div>
                        <span className="text-zinc-600">{new Date(r.createdAt).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
