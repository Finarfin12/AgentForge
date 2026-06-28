'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { AppAlert } from '@/lib/alert';
import { agentStatusColor } from '@/lib/utils';
import { ArrowLeft, Crown, Users, Plus, X, Trash2, Save } from 'lucide-react';

export default function SquadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [squad, setSquad] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', instructions: '', leaderId: '' });
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');

  useEffect(() => {
    Promise.all([
      api.squads.get(id),
      api.agents.list({ isActive: true }),
    ]).then(([s, a]) => {
      setSquad(s as any);
      setAgents(a as any[]);
      setForm({ name: s.name, description: s.description || '', instructions: s.instructions || '', leaderId: s.leaderId });
    }).catch(() => router.push('/squads')).finally(() => setLoading(false));
  }, [id, router]);

  async function handleSave() {
    try {
      const updated = await api.squads.update(id, form);
      setSquad(updated as any);
      setEditing(false);
      AppAlert.success('Squad updated');
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  async function handleAddMember() {
    if (!selectedAgent) return;
    try {
      await api.squads.addMember(id, selectedAgent);
      const updated = await api.squads.get(id);
      setSquad(updated as any);
      setSelectedAgent('');
      AppAlert.success('Member added');
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  async function handleRemoveMember(agentId: string) {
    try {
      await api.squads.removeMember(id, agentId);
      const updated = await api.squads.get(id);
      setSquad(updated as any);
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  const availableAgents = agents.filter(a => !squad?.members?.find((m: any) => m.agentId === a.id));
  const leaderMap = Object.fromEntries(agents.map(a => [a.id, a]));

  if (loading) return <div className="p-6 text-zinc-500">Loading...</div>;
  if (!squad) return null;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => router.push('/squads')}><ArrowLeft size={16} /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-white">{squad.name}</h1>
            <Crown size={18} className="text-amber-400" />
          </div>
          <p className="text-sm text-zinc-500">{squad.members?.length || 0} members</p>
        </div>
        <Button variant="secondary" onClick={() => setEditing(!editing)}>
          {editing ? <X size={14} /> : 'Edit'}
        </Button>
      </div>

      {editing && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Edit Squad</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Textarea label="Description" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <Textarea label="Instructions" rows={3} value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} />
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Leader</label>
              <select value={form.leaderId} onChange={e => setForm({ ...form, leaderId: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200">
                {agents.map(a => <option key={a.id} value={a.id}>{a.displayName}</option>)}
              </select>
            </div>
            <Button onClick={handleSave}><Save size={14} className="mr-1.5" /> Save</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Members ({squad.members?.length || 0})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {squad.members?.length === 0 ? (
              <p className="text-sm text-zinc-600">No members yet</p>
            ) : (
              squad.members?.map((m: any) => (
                <div key={m.agentId} className="flex items-center justify-between bg-zinc-900 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${agentStatusColor(m.agentStatus)}`} />
                    <div>
                      <p className="text-sm text-zinc-300">{m.agentName || m.agentId.slice(0, 8)}</p>
                      <p className="text-xs text-zinc-600">{m.role}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleRemoveMember(m.agentId)}>
                    <X size={12} />
                  </Button>
                </div>
              ))
            )}
            <div className="flex gap-2 pt-2">
              <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200">
                <option value="">Add member...</option>
                {availableAgents.map(a => <option key={a.id} value={a.id}>{a.displayName}</option>)}
              </select>
              <Button size="sm" onClick={handleAddMember} disabled={!selectedAgent}>
                <Plus size={14} />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Squad Info</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-zinc-500">Leader</span>
              <span className="text-zinc-300">{leaderMap[squad.leaderId]?.displayName || squad.leaderId?.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between"><span className="text-zinc-500">Created</span>
              <span className="text-zinc-300">{new Date(squad.createdAt).toLocaleDateString()}</span>
            </div>
            {squad.description && (
              <div className="pt-2 border-t border-zinc-800">
                <span className="text-zinc-500 block mb-1">Description</span>
                <p className="text-zinc-300 text-xs">{squad.description}</p>
              </div>
            )}
            {squad.instructions && (
              <div className="pt-2 border-t border-zinc-800">
                <span className="text-zinc-500 block mb-1">Instructions</span>
                <pre className="text-zinc-300 text-xs whitespace-pre-wrap font-sans">{squad.instructions}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
