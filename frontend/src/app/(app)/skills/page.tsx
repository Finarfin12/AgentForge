'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AppAlert } from '@/lib/alert';
import { BrainCircuit, Plus, Trash2, X, Search, FileText, BookOpen } from 'lucide-react';

export default function SkillsPage() {
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', content: '', origin: 'custom' });
  const [searchQuery, setSearchQuery] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([api.skills.list(), api.agents.list({ isActive: true })])
      .then(([s, a]) => { setSkills(s as any[]); setAgents(a as any[]); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const skill = await api.skills.create(form);
      setSkills([...skills, skill as any]);
      setShowCreate(false);
      setForm({ name: '', description: '', content: '', origin: 'custom' });
      AppAlert.success('Skill created');
    } catch (err) {
      AppAlert.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = await AppAlert.confirm('Delete this skill?');
    if (!confirmed) return;
    try {
      await api.skills.delete(id);
      setSkills(skills.filter(s => s.id !== id));
      if (detail?.id === id) setDetail(null);
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) {
      const s = await api.skills.list();
      setSkills(s as any[]);
      return;
    }
    try {
      const results = await api.skills.search(searchQuery);
      setSkills(results as any[]);
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  function openDetail(skill: any) {
    api.skills.get(skill.id).then(setDetail).catch(() => {});
  }

  async function handleAssign(skillId: string, agentId: string) {
    try {
      await api.skills.assignToAgent(skillId, agentId);
      const updated = await api.skills.get(skillId);
      setDetail(updated as any);
      AppAlert.success('Assigned');
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  async function handleUnassign(skillId: string, agentId: string) {
    try {
      await api.skills.unassignFromAgent(skillId, agentId);
      const updated = await api.skills.get(skillId);
      setDetail(updated as any);
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  const unassignedAgents = agents.filter(a => !detail?.assignedAgents?.find((sa: any) => sa.agentId === a.id));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Skills</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{skills.length} skills · Reusable capabilities for agents</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus size={14} /> New Skill</Button>
      </div>

      <div className="flex gap-2">
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search skills..." className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500/50" />
        <Button variant="secondary" onClick={handleSearch}><Search size={14} /></Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Create Skill</CardTitle>
              <button onClick={() => setShowCreate(false)} className="text-zinc-500 hover:text-white"><X size={16} /></button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-3">
              <Input label="Skill Name" placeholder="Code Review" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Textarea label="Description" placeholder="What this skill does..." rows={2}
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Textarea label="Content (SKILL.md)" placeholder="Full markdown content of the skill..."
                rows={6} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Origin</label>
                <select value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200">
                  <option value="custom">Custom</option>
                  <option value="marketplace">Marketplace</option>
                  <option value="built_in">Built-in</option>
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-4">
          {loading ? <p className="text-sm text-zinc-500">Loading...</p> : skills.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800/50">
                <BrainCircuit size={28} className="text-zinc-600" />
              </div>
              <p className="text-sm text-zinc-400">No skills yet. Create one to give agents reusable capabilities.</p>
              <Button onClick={() => setShowCreate(true)}><Plus size={14} /> Create Skill</Button>
            </div>
          ) : (
            skills.map((skill) => (
              <Card key={skill.id} className={`bg-zinc-950 border-zinc-800 cursor-pointer hover:border-zinc-600 transition-colors ${detail?.id === skill.id ? 'border-purple-500' : ''}`}
                onClick={() => openDetail(skill)}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BookOpen size={16} className="text-zinc-400" />
                    <div>
                      <p className="text-sm font-medium text-white">{skill.name}</p>
                      <p className="text-xs text-zinc-500">{skill.description?.slice(0, 60) || 'No description'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Badge className="bg-zinc-800">{skill.origin}</Badge>
                    <span>{skill.assignedCount || 0} agents</span>
                    <span>{skill.fileCount || 0} files</span>
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
                  <Button size="sm" variant="danger" onClick={() => handleDelete(detail.id)}><Trash2 size={12} /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-zinc-400 text-xs">{detail.description}</p>
                <Badge className="bg-zinc-800">{detail.origin}</Badge>
                {detail.content && (
                  <div>
                    <span className="text-zinc-500 block text-xs mb-1">Content:</span>
                    <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-300 whitespace-pre-wrap max-h-60 overflow-y-auto">{detail.content}</pre>
                  </div>
                )}

                {/* Files */}
                <div>
                  <span className="text-zinc-500 block text-xs mb-1">Files ({detail.files?.length || 0})</span>
                  {detail.files?.map((f: any) => (
                    <div key={f.id} className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900 rounded px-2 py-1 mb-1">
                      <FileText size={10} />
                      <span>{f.path}</span>
                    </div>
                  ))}
                </div>

                {/* Assigned Agents */}
                <div>
                  <span className="text-zinc-500 block text-xs mb-1">Assigned Agents</span>
                  {detail.assignedAgents?.map((sa: any) => (
                    <div key={sa.agentId} className="flex items-center justify-between bg-zinc-900 rounded px-2 py-1 mb-1">
                      <span className="text-xs text-zinc-300">{sa.agentName || sa.agentId.slice(0, 8)}</span>
                      <Button size="sm" variant="ghost" onClick={() => handleUnassign(detail.id, sa.agentId)}><X size={10} /></Button>
                    </div>
                  ))}
                  <div className="flex gap-1 mt-2">
                    <select id="assignSelect" className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200">
                      <option value="">Assign to agent...</option>
                      {unassignedAgents.map(a => <option key={a.id} value={a.id}>{a.displayName}</option>)}
                    </select>
                    <Button size="sm" onClick={() => {
                      const sel = document.getElementById('assignSelect') as HTMLSelectElement;
                      if (sel.value) handleAssign(detail.id, sel.value);
                    }}><Plus size={12} /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
