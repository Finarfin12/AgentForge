'use client';
import { Spinner } from '@/components/Spinner';
import { AppAlert } from '@/lib/alert';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Send, User, Bot, RefreshCw, MessageSquare, Trash2 } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import { DeliberationCard } from '@/components/DeliberationCard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ThreadsPage() {
  const [threads, setThreads] = useState<any[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [creating, setCreating] = useState(false);

  // Deliberation dialog state
  const [showDeliberation, setShowDeliberation] = useState(false);
  const [deliberationProblem, setDeliberationProblem] = useState('');
  const [allAgents, setAllAgents] = useState<any[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetchThreads();
  }, []);

  useEffect(() => {
    if (activeThreadId) {
      fetchMessages(activeThreadId);
      const interval = setInterval(() => {
        fetchMessages(activeThreadId);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [activeThreadId]);

  async function fetchThreads() {
    setLoading(true);
    try {
      const data = await api.threads.list();
      setThreads(data as any[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMessages(id: string) {
    try {
      const data = await api.threads.getMessages(id);
      setMessages(data as any[]);
    } catch {
      // Polling errors during backend restarts; ignore
    }
  }

  async function handleCreateThread() {
    const title = await AppAlert.prompt('Thread title:');
    if (!title) return;
    setCreating(true);
    try {
      const newThread: any = await api.threads.create({ title });
      setThreads([newThread, ...threads]);
      setActiveThreadId(newThread.id);
    } catch (err) {
      AppAlert.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!inputText.trim() || !activeThreadId) return;
    
    const content = inputText;
    setInputText('');
    
    const tempMsg = { id: Date.now().toString(), role: 'user', content, createdAt: new Date() };
    setMessages([...messages, tempMsg]);

    try {
      await api.threads.addMessage(activeThreadId, { role: 'user', content });
      fetchMessages(activeThreadId);
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  async function openDeliberationDialog() {
    try {
      const agents = await api.agents.list({ isActive: true });
      setAllAgents(agents as any[]);
      setSelectedAgentIds((agents as any[]).map(a => a.id));
      setDeliberationProblem('');
      setShowDeliberation(true);
    } catch (err) {
      AppAlert.error('Failed to load agents: ' + (err as Error).message);
    }
  }

  async function handleStartDeliberation() {
    if (!activeThreadId || !deliberationProblem.trim() || selectedAgentIds.length < 2) return;
    setStarting(true);
    try {
      await api.threads.startDeliberation(activeThreadId, {
        problemStatement: deliberationProblem,
        agentIds: selectedAgentIds,
      });
      setShowDeliberation(false);
      fetchMessages(activeThreadId);
    } catch (err) {
      AppAlert.error((err as Error).message);
    } finally {
      setStarting(false);
    }
  }

  function toggleAgent(id: string) {
    setSelectedAgentIds(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  }

  const activeThread = threads.find(t => t.id === activeThreadId);

  async function handleDeleteThread(id: string, title: string) {
    const confirmed = await AppAlert.confirm(`Delete thread "${title}"?`);
    if (!confirmed) return;
    try {
      await api.threads.delete(id);
      if (activeThreadId === id) setActiveThreadId(null);
      setThreads(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] p-4 gap-4">
      {/* Sidebar - Thread List */}
      <Card className="w-1/3 flex flex-col h-full bg-zinc-950 border-zinc-800">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="font-semibold text-white">Threads</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={fetchThreads}><RefreshCw size={14} /></Button>
            <Button size="sm" onClick={handleCreateThread} loading={creating}>
              <Plus size={14} /> New
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <Spinner />
          ) : threads.length === 0 ? (
            <p className="text-sm text-zinc-500 p-2">No threads yet.</p>
          ) : (
            threads.map(t => (
              <div key={t.id} className="group relative">
                <button
                  onClick={() => setActiveThreadId(t.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${activeThreadId === t.id ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'}`}
                >
                  <p className="text-sm font-medium text-white truncate">{t.title}</p>
                  <div className="flex justify-between mt-1 text-xs text-zinc-500">
                    <span>{t.messageCount || 0} msgs</span>
                    <span>{timeAgo(t.createdAt)}</span>
                  </div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteThread(t.id, t.title); }}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-zinc-900/80 text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-900/30 transition-all"
                  title="Delete thread"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Main Area - Chat window */}
      <Card className="flex-1 flex flex-col h-full bg-zinc-950 border-zinc-800">
        {activeThread ? (
          <>
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
              <div>
                <h2 className="font-semibold text-white">{activeThread.title}</h2>
                <p className="text-xs text-zinc-500">{activeThread.status}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={openDeliberationDialog} className="bg-purple-600 hover:bg-purple-700">
                  <Bot size={14} className="mr-1" /> Start Deliberation
                </Button>
                <Button size="sm" variant="secondary" onClick={() => fetchMessages(activeThread.id)}>
                  <RefreshCw size={14} /> Refresh
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <DeliberationCard threadId={activeThread.id} onDeliberationUpdated={() => fetchMessages(activeThread.id)} />
              
              {messages.map(m => (
                <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                  {m.role !== 'user' && (
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 text-zinc-400">
                      {m.role === 'agent' ? <Bot size={16} /> : <User size={16} />}
                    </div>
                  )}
                  <div className="flex flex-col">
                    {m.role === 'agent' && m.agentName && (
                      <span className="text-xs text-zinc-500 mb-1 ml-1 font-medium">{m.agentName}</span>
                    )}
                    <div className={`max-w-full rounded-lg p-3 text-sm prose prose-invert prose-zinc max-w-none ${m.role === 'user' ? 'bg-blue-600 text-white prose-invert prose-blue' : 'bg-zinc-800 text-zinc-200'}`}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content}
                      </ReactMarkdown>
                      <div className={`text-[10px] mt-1 ${m.role === 'user' ? 'text-blue-300' : 'text-zinc-500'}`}>
                        {new Date(m.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                  No messages in this thread yet. Start the conversation!
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-zinc-800">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  className="flex-1"
                  placeholder="Type a message..."
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                />
                <Button type="submit" disabled={!inputText.trim()}>
                  <Send size={16} />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 space-y-4">
            <MessageSquare size={48} className="text-zinc-800" />
            <p>Select a thread to start collaborating</p>
          </div>
        )}
      </Card>

      {/* Deliberation Dialog */}
      {showDeliberation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-lg mx-4 bg-zinc-950 border-zinc-700">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Bot size={18} className="text-purple-400" />
                Start Agent Deliberation
              </h3>
              <p className="text-sm text-zinc-400">Agents will discuss the problem and vote to reach consensus.</p>

              {/* Problem */}
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1 block">Problem Statement</label>
                <textarea
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none"
                  rows={3}
                  placeholder="What should the agents discuss? e.g. 'What's the best architecture for a real-time chat app?'"
                  value={deliberationProblem}
                  onChange={e => setDeliberationProblem(e.target.value)}
                />
              </div>

              {/* Agent Selection */}
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-2 block">
                  Participating Agents ({selectedAgentIds.length}/{allAgents.length})
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1 border border-zinc-800 rounded-lg p-2">
                  {allAgents.length === 0 ? (
                    <p className="text-sm text-zinc-500 p-2">No active agents found. Register agents first.</p>
                  ) : allAgents.map((agent: any) => (
                    <label key={agent.id} className="flex items-center gap-3 p-2 rounded hover:bg-zinc-800/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAgentIds.includes(agent.id)}
                        onChange={() => toggleAgent(agent.id)}
                        className="rounded border-zinc-600"
                      />
                      <span className={`w-2 h-2 rounded-full ${agent.status === 'idle' ? 'bg-green-500' : agent.status === 'busy' ? 'bg-yellow-500' : 'bg-zinc-500'}`} />
                      <span className="text-sm text-white">{agent.displayName}</span>
                      <span className="text-xs text-zinc-500 ml-auto">{agent.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {selectedAgentIds.length < 2 && (
                <p className="text-xs text-yellow-500">Select at least 2 agents for deliberation.</p>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="ghost" onClick={() => setShowDeliberation(false)}>Cancel</Button>
                <Button
                  onClick={handleStartDeliberation}
                  loading={starting}
                  disabled={!deliberationProblem.trim() || selectedAgentIds.length < 2}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Bot size={14} className="mr-1" /> Start Deliberation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

