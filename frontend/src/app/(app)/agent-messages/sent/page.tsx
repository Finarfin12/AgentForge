'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/Spinner';
import { useAgentStore } from '@/lib/store';
import { Send, ArrowLeft, Bot } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const typeBadge: Record<string, string> = {
  message: 'bg-blue-900/40 text-blue-300',
  delegation: 'bg-amber-900/40 text-amber-300',
  debug_request: 'bg-red-900/40 text-red-300',
  discussion: 'bg-purple-900/40 text-purple-300',
};

const TYPE_LABELS: Record<string, string> = {
  message: 'Message',
  delegation: 'Delegation',
  debug_request: 'Debug Request',
  discussion: 'Discussion',
};

export default function SentPage() {
  const { agents } = useAgentStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState('');

  useEffect(() => {
    if (agents.length > 0 && !agentId) {
      setAgentId(agents[0].id);
    }
  }, [agents, agentId]);

  useEffect(() => {
    if (agents.length === 0) {
      api.agents.list({}).then(list => {
        useAgentStore.getState().setAgents(list as any[]);
        if (!agentId && (list as any[]).length > 0) {
          setAgentId((list as any[])[0].id);
        }
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (agentId) fetchSent();
  }, [agentId]);

  async function fetchSent() {
    setLoading(true);
    try {
      const data = await api.agentMessages.sent(agentId);
      setMessages(data as any[]);
    } catch { /* ignore */ }
    setLoading(false);
  }

  const recipientName = (id: string) => (agents as any[])?.find((a: any) => a.id === id)?.displayName || id.slice(0, 8);

  if (!agentId) return <div className="p-6"><Spinner /></div>;

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/agent-messages">
              <Button variant="ghost" size="sm"><ArrowLeft size={14} /></Button>
            </Link>
            <h1 className="text-xl font-semibold text-white flex items-center gap-2">
              <Send size={20} className="text-green-400" /> Sent
            </h1>
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">
            For{' '}
            <select
              className="bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-zinc-300 text-xs"
              value={agentId}
              onChange={e => setAgentId(e.target.value)}
            >
              {(agents as any[])?.map((a: any) => (
                <option key={a.id} value={a.id}>{a.displayName || a.name}</option>
              ))}
            </select>
          </p>
        </div>
        <Link href="/agent-messages/compose">
          <Button size="sm">Compose</Button>
        </Link>
      </div>

      <Card className="flex-1 bg-zinc-950 border-zinc-800 overflow-hidden">
        <CardContent className="p-0 h-full overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center"><Spinner /></div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">No sent messages.</div>
          ) : (
            messages.map((msg) => (
              <button
                key={msg.id}
                onClick={() => setSelected(selected?.id === msg.id ? null : msg)}
                className={`w-full text-left px-4 py-3 border-b border-zinc-800 hover:bg-zinc-900/50 transition-colors ${selected?.id === msg.id ? 'bg-zinc-800/50' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-white">To: {recipientName(msg.toAgentId)}</span>
                  <span className="text-xs text-zinc-600 shrink-0">{timeAgo(msg.createdAt)}</span>
                </div>
                <p className="text-xs text-zinc-300 mt-0.5 truncate">{msg.subject}</p>
                <div className="mt-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${typeBadge[msg.type] || typeBadge.message}`}>
                    {TYPE_LABELS[msg.type] || msg.type}
                  </span>
                </div>
                {selected?.id === msg.id && (
                  <div className="mt-3 p-3 bg-zinc-900 rounded-lg">
                    <div className="prose prose-invert prose-zinc max-w-none text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.body}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
