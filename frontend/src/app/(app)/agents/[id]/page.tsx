'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/Spinner';
import { AppAlert } from '@/lib/alert';
import { agentStatusColor, timeAgo } from '@/lib/utils';
import { ArrowLeft, Heart, Trash2, Save, X, Activity, CheckCircle2, Clock, Zap, Cpu, Plus, Edit3 } from 'lucide-react';
import type { Agent } from '@/lib/types';

const COMMON_CAPABILITIES = [
  'tool-calling',
  'function-execution',
  'code-analysis',
  'task-delegation',
  'pipeline-orchestration',
  'web-research',
  'data-analysis',
  'code-generation',
  'debugging',
  'documentation',
  'testing',
  'review',
  'agentic-coding',
];

const COMMON_TOOLS = [
  'bash', 'read', 'write', 'edit', 'grep', 'glob', 'search', 'fetch',
];

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    displayName: '',
    description: '',
    capabilities: [] as string[],
    model: '',
    maxTokens: 4096,
    temperature: 0.7,
    tools: [] as string[],
    maxConcurrentTasks: 5,
  });
  const [customCap, setCustomCap] = useState('');
  const [customTool, setCustomTool] = useState('');

  useEffect(() => {
    fetchAgent();
  }, [id]);

  async function fetchAgent() {
    try {
      const data = await api.agents.get(id);
      setAgent(data as Agent);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function startEditing() {
    if (!agent) return;
    const cfg = agent.config || {};
    setForm({
      displayName: agent.displayName,
      description: agent.description || '',
      capabilities: [...(agent.capabilities || [])],
      model: (cfg.model as string) || '',
      maxTokens: (cfg.maxTokens as number) || 4096,
      temperature: (cfg.temperature as number) || 0.7,
      tools: ((cfg.tools as string[]) || []),
      maxConcurrentTasks: agent.maxConcurrentTasks,
    });
    setCustomCap('');
    setCustomTool('');
    setEditing(true);
  }

  function toggleCapability(cap: string) {
    setForm(prev => ({
      ...prev,
      capabilities: prev.capabilities.includes(cap)
        ? prev.capabilities.filter(c => c !== cap)
        : [...prev.capabilities, cap],
    }));
  }

  function addCustomCapability() {
    const cap = customCap.trim().toLowerCase().replace(/\s+/g, '-');
    if (cap && !form.capabilities.includes(cap)) {
      setForm(prev => ({ ...prev, capabilities: [...prev.capabilities, cap] }));
    }
    setCustomCap('');
  }

  function toggleTool(tool: string) {
    setForm(prev => ({
      ...prev,
      tools: prev.tools.includes(tool)
        ? prev.tools.filter(t => t !== tool)
        : [...prev.tools, tool],
    }));
  }

  function addCustomTool() {
    const tool = customTool.trim().toLowerCase();
    if (tool && !form.tools.includes(tool)) {
      setForm(prev => ({ ...prev, tools: [...prev.tools, tool] }));
    }
    setCustomTool('');
  }

  async function handleSave() {
    if (!agent) return;
    setSaving(true);
    try {
      const config: Record<string, unknown> = {
        model: form.model,
        maxTokens: form.maxTokens,
        temperature: form.temperature,
        tools: form.tools,
        provider: (agent.config as any)?.provider || 'cli',
      };
      if ((agent.config as any)?.apiEndpoint) {
        config.apiEndpoint = (agent.config as any).apiEndpoint;
      }

      const updated = await api.agents.update(id, {
        displayName: form.displayName,
        description: form.description,
        capabilities: form.capabilities,
        config,
        maxConcurrentTasks: form.maxConcurrentTasks,
      });
      setAgent(updated as Agent);
      setEditing(false);
      AppAlert.success('Agent updated');
    } catch (err) {
      AppAlert.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleHeartbeat() {
    if (!agent) return;
    try {
      const result = await api.agents.heartbeat(id) as Partial<Agent>;
      setAgent({ ...agent, ...result });
      AppAlert.success('Heartbeat sent');
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  async function handleDelete() {
    if (!agent) return;
    const confirmed = await AppAlert.confirm(
      `Delete agent "${agent.displayName}"? This action cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      await api.agents.delete(id);
      AppAlert.success('Agent deleted');
      router.push('/agents');
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[50vh]"><Spinner /></div>;
  }

  if (!agent) {
    return (
      <div className="p-6">
        <div className="text-zinc-500">Agent not found.</div>
        <Button variant="ghost" onClick={() => router.push('/agents')} className="mt-2">
          <ArrowLeft size={14} className="mr-2" /> Back to Agents
        </Button>
      </div>
    );
  }

  const cfg = agent.config || {};

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => router.push('/agents')}>
          <ArrowLeft size={16} />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-white">{agent.displayName}</h1>
            <span className={`w-2.5 h-2.5 rounded-full ${agentStatusColor(agent.status)}`} />
            <Badge className="text-xs">{agent.status}</Badge>
          </div>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">
            {agent.name} · updated {timeAgo(agent.updatedAt)}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="secondary" onClick={handleHeartbeat}>
            <Heart size={12} className="mr-1.5" /> Ping
          </Button>
          {!editing && (
            <Button size="sm" variant="secondary" onClick={startEditing}>
              <Edit3 size={12} className="mr-1.5" /> Configure
            </Button>
          )}
          <Button size="sm" variant="danger" onClick={handleDelete}>
            <Trash2 size={12} className="mr-1.5" /> Delete
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-zinc-950 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-900/20 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-green-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Tasks Done</p>
              <p className="text-lg font-semibold text-white">{agent.totalTasksCompleted}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-950 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-900/20 flex items-center justify-center">
              <Clock size={18} className="text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Avg Response</p>
              <p className="text-lg font-semibold text-white">{agent.avgResponseTimeMs}ms</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-950 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-900/20 flex items-center justify-center">
              <Cpu size={18} className="text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Tokens Used</p>
              <p className="text-lg font-semibold text-white">{Number(agent.totalTokensUsed).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-950 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-900/20 flex items-center justify-center">
              <Activity size={18} className="text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Success Rate</p>
              <p className="text-lg font-semibold text-white">{agent.successRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader><CardTitle className="text-sm text-zinc-300">Agent Info</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Display Name</span>
              <span className="text-zinc-300">{agent.displayName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Active</span>
              <span className={agent.isActive ? 'text-green-400' : 'text-red-400'}>{agent.isActive ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Tasks</span>
              <span className="text-zinc-300">{agent.currentTaskCount} / {agent.maxConcurrentTasks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Last Heartbeat</span>
              <span className="text-zinc-300">{agent.lastHeartbeatAt ? timeAgo(agent.lastHeartbeatAt) : 'Never'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Created</span>
              <span className="text-zinc-300">{new Date(agent.createdAt).toLocaleDateString()}</span>
            </div>
            {agent.description && (
              <div className="pt-2 border-t border-zinc-800">
                <span className="text-zinc-500 block mb-1">Description</span>
                <span className="text-zinc-300 text-xs">{agent.description}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader><CardTitle className="text-sm text-zinc-300">Capabilities</CardTitle></CardHeader>
          <CardContent>
            {agent.capabilities.length === 0 ? (
              <p className="text-sm text-zinc-600">No capabilities defined</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {agent.capabilities.map((cap) => (
                  <Badge key={cap} className="text-xs">{cap}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Configuration */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader><CardTitle className="text-sm text-zinc-300">Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-zinc-500 block mb-1">Model</span>
              <span className="text-sm text-zinc-300">{(cfg.model as string) || '-'}</span>
            </div>
            <div>
              <span className="text-xs text-zinc-500 block mb-1">max-tokens</span>
              <span className="text-sm text-zinc-300">{String(cfg.maxTokens ?? '-')}</span>
            </div>
            <div>
              <span className="text-xs text-zinc-500 block mb-1">temperature</span>
              <span className="text-sm text-zinc-300">{String(cfg.temperature ?? '-')}</span>
            </div>
            <div>
              <span className="text-xs text-zinc-500 block mb-1">Provider</span>
              <span className="text-sm text-zinc-300">{(cfg.provider as string) || '-'}</span>
            </div>
          </div>
          {(cfg.tools as string[])?.length > 0 && (
            <div>
              <span className="text-xs text-zinc-500 block mb-1">Tools</span>
              <div className="flex flex-wrap gap-1">
                {(cfg.tools as string[]).map((t: string) => (
                  <Badge key={t} className="text-xs bg-zinc-800 text-zinc-300">{t}</Badge>
                ))}
              </div>
            </div>
          )}
          {(cfg as any)?.apiEndpoint && (
            <div>
              <span className="text-xs text-zinc-500 block mb-1">API Endpoint</span>
              <span className="text-sm text-zinc-300 font-mono">{(cfg as any).apiEndpoint}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Form */}
      {editing && (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-zinc-300">Edit Configuration</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                <X size={14} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Display Name */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Display Name</label>
              <input
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none"
              />
            </div>

            {/* Capabilities */}
            <div>
              <label className="block text-xs text-zinc-500 mb-2">Capabilities</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {COMMON_CAPABILITIES.map(cap => (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => toggleCapability(cap)}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                      form.capabilities.includes(cap)
                        ? 'bg-purple-900/40 border-purple-700 text-purple-200'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                    }`}
                  >
                    {cap}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                <input
                  value={customCap}
                  onChange={(e) => setCustomCap(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomCapability()}
                  placeholder="Add custom capability..."
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                />
                <Button size="sm" variant="ghost" onClick={addCustomCapability}>
                  <Plus size={12} />
                </Button>
              </div>
              {form.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.capabilities.map(cap => (
                    <span key={cap} className="text-xs bg-purple-900/30 text-purple-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      {cap}
                      <button onClick={() => toggleCapability(cap)} className="text-purple-400 hover:text-purple-200">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Model */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Model</label>
                <input
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder="e.g. claude-sonnet-4-20250514"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Max Tokens</label>
                <input
                  type="number"
                  value={form.maxTokens}
                  onChange={(e) => setForm({ ...form, maxTokens: parseInt(e.target.value) || 1024 })}
                  min={256}
                  max={128000}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Temperature</label>
                <input
                  type="number"
                  value={form.temperature}
                  onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) || 0 })}
                  min={0}
                  max={2}
                  step={0.1}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                />
              </div>
            </div>

            {/* Tools */}
            <div>
              <label className="block text-xs text-zinc-500 mb-2">Tools</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {COMMON_TOOLS.map(tool => (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => toggleTool(tool)}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                      form.tools.includes(tool)
                        ? 'bg-blue-900/40 border-blue-700 text-blue-200'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                    }`}
                  >
                    {tool}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                <input
                  value={customTool}
                  onChange={(e) => setCustomTool(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomTool()}
                  placeholder="Add custom tool..."
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                />
                <Button size="sm" variant="ghost" onClick={addCustomTool}>
                  <Plus size={12} />
                </Button>
              </div>
              {form.tools.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.tools.map(tool => (
                    <span key={tool} className="text-xs bg-blue-900/30 text-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      {tool}
                      <button onClick={() => toggleTool(tool)} className="text-blue-400 hover:text-blue-200">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Max Concurrent Tasks */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Max Concurrent Tasks</label>
              <input
                type="number"
                value={form.maxConcurrentTasks}
                onChange={(e) => setForm({ ...form, maxConcurrentTasks: parseInt(e.target.value) || 1 })}
                min={1}
                max={50}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-zinc-800">
              <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save size={14} className="mr-1.5" /> {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skills */}
      {agent.skills && agent.skills.length > 0 && (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader><CardTitle className="text-sm text-zinc-300">Skills ({agent.skills.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {agent.skills.map((skill) => (
              <div key={skill.id} className="flex items-center justify-between bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                <div>
                  <p className="text-sm text-zinc-300">{skill.name}</p>
                  {skill.description && <p className="text-xs text-zinc-500 mt-0.5">{skill.description}</p>}
                </div>
                <Badge className={skill.isEnabled ? 'bg-green-900/30 text-green-400' : 'bg-zinc-800 text-zinc-500'}>
                  {skill.isEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
