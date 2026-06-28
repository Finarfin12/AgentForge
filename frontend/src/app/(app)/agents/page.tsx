'use client';
import { useEffect, useState, useRef } from 'react';
import { Spinner } from '@/components/Spinner';
import { AppAlert } from '@/lib/alert';
import { api } from '@/lib/api';
import { useAgentStore } from '@/lib/store';
import { useAgentSocket } from '@/lib/socket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { agentStatusColor, timeAgo } from '@/lib/utils';
import { Plus, Heart, Trash2, X, Play, Loader2, Radar, Zap, Send, RotateCcw, Star } from 'lucide-react';
import type { Agent } from '@/lib/types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  durationMs?: number;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export default function AgentsPage() {
  const { agents, setAgents, updateAgent } = useAgentStore();
  const [loading, setLoading] = useState(true);
  useAgentSocket();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', displayName: '', description: '', capabilities: '', runtimeId: '', skillIds: '' });
  const [runtimes, setRuntimes] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);

  // Discover state
  const [discovering, setDiscovering] = useState(false);

  // Chat/Invoke state
  const [invokeAgent, setInvokeAgent] = useState<Agent | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [invokePrompt, setInvokePrompt] = useState('');
  const [invokeLoading, setInvokeLoading] = useState(false);
  const [invokeError, setInvokeError] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    Promise.all([
      api.agents.list(),
      api.runtimes.list(),
      api.skills.list(),
    ]).then(([a, r, s]) => {
      setAgents(a as Agent[]);
      setRuntimes(r as any[]);
      setSkills(s as any[]);
    }).finally(() => setLoading(false));
  }, [setAgents]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, invokeLoading, streamingContent]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const agent = await api.agents.create({
        name: form.name,
        displayName: form.displayName,
        description: form.description,
        capabilities: form.capabilities.split(',').map((c) => c.trim()).filter(Boolean),
        runtimeId: form.runtimeId || undefined,
        skillIds: form.skillIds ? form.skillIds.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      });
      setAgents([...agents, agent as Agent]);
      setShowCreate(false);
      setForm({ name: '', displayName: '', description: '', capabilities: '', runtimeId: '', skillIds: '' });
    } catch (err) {
      AppAlert.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function handleHeartbeat(id: string) {
    try {
      const result = await api.agents.heartbeat(id) as Partial<Agent>;
      updateAgent(id, result);
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  async function handleDelete(id: string, name: string) {
    const confirmed = await AppAlert.confirm(`Delete agent "${name}"?`);
    if (!confirmed) return;
    try {
      await api.agents.delete(id);
      setAgents(agents.filter((a) => a.id !== id));
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  async function handleDiscover() {
    setDiscovering(true);
    try {
      const result = await api.agents.discover();
      const updated = await api.agents.list();
      setAgents(updated as Agent[]);
      if (result.registered.length === 0) {
        AppAlert.info(`Scanned and found ${result.discovered} service(s), but all were already registered.`);
      } else {
        AppAlert.success(`Discovered ${result.discovered} service(s) and registered ${result.registered.length} new agent(s).`);
      }
    } catch (err) {
      AppAlert.error(`Discovery failed: ${(err as Error).message}`);
    } finally {
      setDiscovering(false);
    }
  }

  async function handleInvoke() {
    if (!invokeAgent || !invokePrompt.trim() || invokeLoading) return;
    const userMessage = invokePrompt.trim();
    setInvokePrompt('');
    setInvokeLoading(true);
    setInvokeError('');
    setStreamingContent('');

    // Add user message to chat immediately
    setChatMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    const history = chatMessages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const controller = new AbortController();
      abortRef.current = controller;
      const stream = api.agents.invokeStream(invokeAgent.id, {
        prompt: userMessage,
        history: history.length > 0 ? history : undefined,
      }, controller.signal);

      let fullContent = '';

      for await (const event of stream) {
        if (event.type === 'token' && event.token) {
          fullContent += event.token;
          setStreamingContent(fullContent);
        } else if (event.type === 'done') {
          setChatMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: event.content || fullContent,
              durationMs: event.durationMs,
              usage: event.usage,
            },
          ]);
          setStreamingContent('');
        } else if (event.type === 'error') {
          setInvokeError(event.message || 'Stream error');
          setStreamingContent('');
        }
      }
    } catch (err) {
      setInvokeError((err as Error).message);
      setStreamingContent('');
    } finally {
      setInvokeLoading(false);
    }
  }

  function stopStreaming() {
    abortRef.current?.abort();
    setInvokeLoading(false);
    setStreamingContent('');
  }

  function openInvoke(agent: Agent) {
    abortRef.current?.abort();
    setInvokeAgent(agent);
    setChatMessages([]);
    setInvokePrompt('');
    setInvokeError('');
    setStreamingContent('');
    setTimeout(() => textareaRef.current?.focus(), 100);
  }

  function closeInvoke() {
    abortRef.current?.abort();
    setInvokeAgent(null);
    setChatMessages([]);
    setInvokePrompt('');
    setInvokeError('');
    setStreamingContent('');
  }

  function clearChat() {
    abortRef.current?.abort();
    setChatMessages([]);
    setInvokeError('');
    setStreamingContent('');
    setInvokeLoading(false);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Agents</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{agents.length} registered · {agents.filter(a => a.status === 'idle' || a.status === 'busy').length} online</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleDiscover} loading={discovering}>
            <Radar size={14} /> Auto-Discover
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={14} /> New Agent
          </Button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Register Agent</CardTitle>
              <button onClick={() => setShowCreate(false)} className="text-zinc-500 hover:text-white">
                <X size={16} />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Name (unique slug)" placeholder="hermes-agent" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <Input label="Display Name" placeholder="Hermes" value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })} required />
              </div>
              <Textarea label="Description" placeholder="What this agent does..." rows={2}
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Input label="Capabilities (comma-separated)" placeholder="code,review,debug"
                value={form.capabilities} onChange={(e) => setForm({ ...form, capabilities: e.target.value })} />
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Runtime</label>
                <select value={form.runtimeId} onChange={(e) => setForm({ ...form, runtimeId: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200">
                  <option value="">None (auto)</option>
                  {runtimes.map(r => <option key={r.id} value={r.id}>{r.name} ({r.provider})</option>)}
                </select>
              </div>
              <Input label="Skill IDs (comma-separated)" placeholder="skill-uuid-1,skill-uuid-2"
                value={form.skillIds} onChange={(e) => setForm({ ...form, skillIds: e.target.value })} />
              <div className="flex gap-2 pt-1">
                <Button type="submit" loading={creating}>Create</Button>
                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Agent list */}
      {loading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : agents.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800/50">
            <Zap size={28} className="text-zinc-600" />
          </div>
          <div>
            <p className="text-sm text-zinc-400">No agents registered yet.</p>
            <p className="text-xs text-zinc-600 mt-1">Click &quot;Auto-Discover&quot; to find local agents, or register one manually.</p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="secondary" onClick={handleDiscover} loading={discovering}>
              <Radar size={14} /> Auto-Discover
            </Button>
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={14} /> Register Manually
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map((a) => (
            <Card key={a.id} className="flex flex-col">
              <CardContent className="py-4 space-y-3 flex-grow">
                <div className="flex items-start gap-3">
                  <span className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${agentStatusColor(a.status)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{a.displayName}</p>
                    <p className="text-xs text-zinc-500 font-mono">{a.name}</p>
                  </div>
                  <span className="text-xs text-zinc-500 capitalize">{a.status}</span>
                </div>

                {a.description && (
                  <p className="text-xs text-zinc-400 line-clamp-2">{a.description}</p>
                )}

                {a.runtimeName && (
                  <div className="text-[10px] text-zinc-600 flex items-center gap-1">
                    Runtime: {a.runtimeName} ({a.runtimeProvider})
                    {a.runtimeStatus && <span className={`w-1.5 h-1.5 rounded-full ${a.runtimeStatus === 'online' ? 'bg-green-500' : 'bg-zinc-600'}`} />}
                  </div>
                )}

                {a.capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {a.capabilities.slice(0, 4).map((c) => (
                      <span key={c} className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{c}</span>
                    ))}
                    {a.capabilities.length > 4 && (
                      <span className="text-xs text-zinc-600">+{a.capabilities.length - 4}</span>
                    )}
                  </div>
                )}
                
                {a.config && (
                  <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800/50 text-xs text-zinc-500 space-y-1">
                    <p className="flex justify-between"><span className="text-zinc-600">Provider:</span> {String((a.config as any)?.provider || 'unknown')}</p>
                    <p className="flex justify-between"><span className="text-zinc-600">Model:</span> {String((a.config as any)?.model || 'default')}</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-zinc-500 pt-1 border-t border-zinc-800">
                  <span>{a.currentTaskCount}/{a.maxConcurrentTasks} tasks · {a.totalTasksCompleted} done</span>
                  <span>{timeAgo(a.lastHeartbeatAt)}</span>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" onClick={() => openInvoke(a)}>
                    <Play size={12} /> Chat
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => {
                    import('sweetalert2').then(({ default: Swal }) => {
                      Swal.fire({
                        title: 'Enter new model name:',
                        input: 'text',
                        inputValue: String((a.config as any)?.model || ''),
                        showCancelButton: true,
                        background: '#18181b', color: '#fff', confirmButtonColor: '#10b981'
                      }).then((result) => {
                        if (result.isConfirmed && result.value) {
                          api.agents.update(a.id, { config: { ...(a.config || {}), model: result.value } })
                            .then(updated => updateAgent(a.id, updated as Partial<Agent>))
                            .catch(err => AppAlert.error(err.message));
                        }
                      });
                    });
                  }}>
                    Config
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleHeartbeat(a.id)}>
                    <Heart size={12} /> Ping
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(a.id, a.displayName)}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Chat Invoke Modal */}
      {invokeAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-2xl mx-4 h-[80vh] flex flex-col">
            {/* Header */}
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${agentStatusColor(invokeAgent.status)}`} />
                  <div>
                    <CardTitle className="text-base">{invokeAgent.displayName}</CardTitle>
                    <p className="text-xs text-zinc-500 font-mono">
                      {invokeAgent.name} · {(invokeAgent.config as any)?.provider}/{(invokeAgent.config as any)?.model}
                      {chatMessages.length > 0 && (
                        <span className="ml-2 text-zinc-600">· {chatMessages.length} messages</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {chatMessages.length > 0 && (
                    <Button size="sm" variant="ghost" onClick={clearChat}>
                      <RotateCcw size={12} /> New Chat
                    </Button>
                  )}
                  <button onClick={closeInvoke} className="text-zinc-500 hover:text-white">
                    <X size={18} />
                  </button>
                </div>
              </div>
            </CardHeader>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
              {chatMessages.length === 0 && !invokeLoading && (
                <div className="text-center py-16 space-y-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800/50">
                    <Play size={20} className="text-zinc-500" />
                  </div>
                  <p className="text-sm text-zinc-500">Start a conversation with {invokeAgent.displayName}</p>
                  <p className="text-xs text-zinc-600">Multi-turn chat — the agent remembers context across messages.</p>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-blue-600/20 border border-blue-500/20 text-blue-100'
                      : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-300'
                  }`}>
                    {msg.role === 'assistant' && (
                      <p className="text-xs font-medium text-zinc-500 mb-1.5">{invokeAgent.displayName}</p>
                    )}
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    {msg.role === 'assistant' && msg.durationMs !== undefined && (
                      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-zinc-700/30 text-xs text-zinc-600">
                        <span>{msg.durationMs}ms</span>
                        {msg.usage && <span>{msg.usage.totalTokens} tokens</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {invokeLoading && !streamingContent && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3">
                    <p className="text-xs font-medium text-zinc-500 mb-1.5">{invokeAgent.displayName}</p>
                    <div className="flex items-center gap-2 text-zinc-500">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              {streamingContent && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 max-w-[85%]">
                    <p className="text-xs font-medium text-zinc-500 mb-1.5">{invokeAgent.displayName}</p>
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {streamingContent}
                      <span className="inline-block w-1.5 h-4 bg-zinc-500 ml-0.5 animate-pulse align-middle" />
                    </p>
                  </div>
                </div>
              )}

              {invokeError && (
                <div className="flex justify-center">
                  <div className="bg-red-900/20 border border-red-500/20 rounded-lg px-4 py-2 text-sm text-red-400">
                    {invokeError}
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input area */}
            <div className="flex-shrink-0 border-t border-zinc-800 p-4">
              <div className="flex gap-2">
                <textarea
                  ref={textareaRef}
                  placeholder={`Message ${invokeAgent.displayName}...`}
                  rows={2}
                  value={invokePrompt}
                  onChange={(e) => setInvokePrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleInvoke();
                    }
                  }}
                  disabled={invokeLoading}
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none disabled:opacity-50"
                />
                {invokeLoading ? (
                  <Button
                    onClick={stopStreaming}
                    variant="danger"
                    className="self-end"
                  >
                    <X size={14} />
                  </Button>
                ) : (
                  <Button
                    onClick={handleInvoke}
                    disabled={!invokePrompt.trim()}
                    className="self-end"
                  >
                    <Send size={14} />
                  </Button>
                )}
              </div>
              <p className="text-xs text-zinc-600 mt-1.5">Enter to send · Shift+Enter for newline</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
