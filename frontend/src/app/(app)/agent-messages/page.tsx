'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/Spinner';
import { useAgentStore } from '@/lib/store';
import { useAgentMessageSocket } from '@/lib/socket';
import { Mail, MailOpen, Send, Reply, Archive, AlertCircle, Loader2, Bot, Inbox } from 'lucide-react';
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

export default function AgentInboxPage() {
  const { agents } = useAgentStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

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
    if (agentId) fetchInbox();
  }, [agentId]);

  useAgentMessageSocket(() => {
    if (agentId) fetchInbox();
  });

  async function fetchInbox() {
    setLoading(true);
    try {
      const data = await api.agentMessages.inbox(agentId);
      setMessages(data as any[]);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleMarkRead(msg: any) {
    if (msg.status === 'unread') {
      await api.agentMessages.markRead(msg.id, agentId);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'read', readAt: new Date() } : m));
    }
    setSelected(msg);
  }

  async function handleArchive(id: string) {
    await api.agentMessages.archive(id, agentId);
    setMessages(prev => prev.filter(m => m.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  async function handleReply() {
    if (!replyText.trim() || !selected) return;
    setSending(true);
    try {
      await api.agentMessages.reply(selected.id, {
        fromAgentId: agentId,
        toAgentId: selected.fromAgentId,
        subject: `Re: ${selected.subject}`,
        body: replyText,
      });
      setReplyText('');
      fetchInbox();
    } catch { /* ignore */ }
    setSending(false);
  }

  const senderName = (id: string) => (agents as any[])?.find((a: any) => a.id === id)?.displayName || id.slice(0, 8);

  // Fetch thread messages when a message is selected
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  useEffect(() => {
    if (selected?.threadId) {
      api.agentMessages.thread(selected.threadId).then(r => setThreadMessages(r as any[])).catch(() => {});
    } else {
      setThreadMessages([]);
    }
  }, [selected]);

  if (!agentId) return <div className="p-6"><Spinner /></div>;

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Inbox size={20} className="text-blue-400" /> Agent Inbox
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Messages for{' '}
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
        <div className="flex gap-2">
          <Link href="/agent-messages/sent">
            <Button variant="secondary" size="sm"><Send size={14} className="mr-1" /> Sent</Button>
          </Link>
          <Link href="/agent-messages/compose">
            <Button size="sm">Compose</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left — message list */}
        <Card className="w-96 bg-zinc-950 border-zinc-800 flex-shrink-0 overflow-hidden">
          <CardContent className="p-0 h-full overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center"><Spinner /></div>
            ) : messages.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">Inbox empty.</div>
            ) : (
              messages.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => handleMarkRead(msg)}
                  className={`w-full text-left px-4 py-3 border-b border-zinc-800 hover:bg-zinc-900/50 transition-colors ${selected?.id === msg.id ? 'bg-zinc-800/50' : ''} ${msg.status === 'unread' ? 'bg-zinc-900/30' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {msg.status === 'unread' ? <Mail size={14} className="text-blue-400 flex-shrink-0" /> : <MailOpen size={14} className="text-zinc-600 flex-shrink-0" />}
                      <span className="text-sm font-medium text-white truncate">{senderName(msg.fromAgentId)}</span>
                    </div>
                    <span className="text-xs text-zinc-600 shrink-0">{timeAgo(msg.createdAt)}</span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-0.5 truncate pl-6">{msg.subject}</p>
                  <div className="pl-6 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${typeBadge[msg.type] || typeBadge.message}`}>
                      {TYPE_LABELS[msg.type] || msg.type}
                    </span>
                    {msg.priority === 'high' && <span className="text-[10px] text-red-400 ml-1">High</span>}
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right — message detail / thread */}
        <Card className="flex-1 bg-zinc-950 border-zinc-800 overflow-hidden">
          <CardContent className="p-0 h-full flex flex-col">
            {!selected ? (
              <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                Select a message to read
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {threadMessages.map((msg) => (
                    <div key={msg.id} className={`p-3 rounded-lg ${msg.fromAgentId === agentId ? 'bg-blue-900/20 border border-blue-900/30 ml-8' : 'bg-zinc-900 border border-zinc-800 mr-8'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-zinc-300">
                          {msg.fromAgentId === agentId ? 'You' : senderName(msg.fromAgentId)}
                          <span className={`ml-2 text-[10px] px-1 py-0.5 rounded ${typeBadge[msg.type] || typeBadge.message}`}>
                            {TYPE_LABELS[msg.type] || msg.type}
                          </span>
                        </span>
                        <span className="text-[10px] text-zinc-600">{new Date(msg.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-zinc-400 font-medium mb-1">{msg.subject}</p>
                      <div className="prose prose-invert prose-zinc max-w-none text-sm">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.body}</ReactMarkdown>
                      </div>
                      {msg.relatedTaskId && (
                        <Link href={`/tasks/${msg.relatedTaskId}`} className="text-xs text-blue-400 hover:underline mt-1 inline-block">
                          View related task →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>

                {/* Reply box */}
                <div className="border-t border-zinc-800 p-3">
                  <textarea
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-white resize-none h-20"
                    placeholder="Reply..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <Button variant="ghost" size="sm" onClick={() => handleArchive(selected.id)}>
                      <Archive size={14} className="mr-1" /> Archive
                    </Button>
                    <Button size="sm" onClick={handleReply} disabled={sending || !replyText.trim()}>
                      {sending ? <Loader2 size={14} className="animate-spin mr-1" /> : <Reply size={14} className="mr-1" />}
                      Reply
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
