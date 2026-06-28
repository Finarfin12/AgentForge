'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { AppAlert } from '@/lib/alert';
import { GitBranch, Plus, Users, Crown, Trash2, X, Archive, EyeOff } from 'lucide-react';

export default function SquadsPage() {
  const router = useRouter();
  const [squads, setSquads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', instructions: '', leaderId: '' });
  const [agents, setAgents] = useState<any[]>([]);
  const [scope, setScope] = useState<'active' | 'archived'>('active');

  useEffect(() => {
    Promise.all([
      api.squads.list(scope),
      api.agents.list({ isActive: true }),
    ]).then(([s, a]) => {
      setSquads(s as any[]);
      setAgents(a as any[]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [scope]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.leaderId) { AppAlert.error('Please select a leader agent'); return; }
    setCreating(true);
    try {
      const squad = await api.squads.create(form);
      setSquads([...squads, squad as any]);
      setShowCreate(false);
      setForm({ name: '', description: '', instructions: '', leaderId: '' });
      AppAlert.success('Squad created');
    } catch (err) {
      AppAlert.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function handleArchive(id: string) {
    try {
      await api.squads.archive(id);
      setSquads(squads.filter(s => s.id !== id));
      AppAlert.success('Squad archived');
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  async function handleRestore(id: string) {
    try {
      await api.squads.restore(id);
      setSquads(squads.filter(s => s.id !== id));
      AppAlert.success('Squad restored');
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = await AppAlert.confirm('Delete this squad forever?');
    if (!confirmed) return;
    try {
      await api.squads.delete(id);
      setSquads(squads.filter(s => s.id !== id));
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  const leaderMap = Object.fromEntries(agents.map(a => [a.id, a]));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Squads</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{squads.length} squads</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-zinc-900 rounded-lg p-0.5">
            <button onClick={() => setScope('active')} className={`px-3 py-1 text-xs rounded-md transition-colors ${scope === 'active' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}>Active</button>
            <button onClick={() => setScope('archived')} className={`px-3 py-1 text-xs rounded-md transition-colors ${scope === 'archived' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}>Archived</button>
          </div>
          <Button onClick={() => setShowCreate(true)}><Plus size={14} /> New Squad</Button>
        </div>
      </div>

      {showCreate && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Create Squad</CardTitle>
              <button onClick={() => setShowCreate(false)} className="text-zinc-500 hover:text-white"><X size={16} /></button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-3">
              <Input label="Squad Name" placeholder="Frontend Team" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Textarea label="Description" placeholder="What this squad does..." rows={2}
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Textarea label="Instructions (leader briefing)" placeholder="Instructions for the squad leader..." rows={2}
                value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Leader Agent *</label>
                <select value={form.leaderId} onChange={(e) => setForm({ ...form, leaderId: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500/50">
                  <option value="">Select leader...</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.displayName} ({a.name})</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" loading={creating}>Create</Button>
                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? <p className="text-sm text-zinc-500">Loading...</p> : squads.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800/50">
            <GitBranch size={28} className="text-zinc-600" />
          </div>
          <p className="text-sm text-zinc-400">No squads yet. Create one to group your agents under a leader.</p>
          <Button onClick={() => setShowCreate(true)}><Plus size={14} /> Create Squad</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {squads.map((squad: any) => {
            const leader = leaderMap[squad.leaderId];
            return (
              <Card key={squad.id} className="bg-zinc-950 border-zinc-800 cursor-pointer hover:border-zinc-600 transition-colors"
                onClick={() => router.push(`/squads/${squad.id}`)}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <GitBranch size={18} className="text-zinc-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{squad.name}</p>
                      {squad.description && <p className="text-xs text-zinc-500 line-clamp-1">{squad.description}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Crown size={12} className="text-amber-400" />
                    <span>{leader?.displayName || squad.leaderName || squad.leaderId?.slice(0, 8)}</span>
                    <Users size={12} className="ml-2" />
                    <span>{squad.memberCount || 0} members</span>
                  </div>

                  <div className="flex gap-2 pt-1 border-t border-zinc-800" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="secondary" onClick={() => router.push(`/squads/${squad.id}`)}>
                      <Users size={12} /> View
                    </Button>
                    {scope === 'active' ? (
                      <Button size="sm" variant="ghost" onClick={() => handleArchive(squad.id)}>
                        <Archive size={12} />
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => handleRestore(squad.id)}>
                        <EyeOff size={12} /> Restore
                      </Button>
                    )}
                    <Button size="sm" variant="danger" onClick={() => handleDelete(squad.id)}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
