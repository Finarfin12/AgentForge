'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/Spinner';
import { useAgentStore } from '@/lib/store';
import { Send, ArrowLeft, Loader2, Bot, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const MESSAGE_TYPES = [
  { value: 'message', label: 'Message' },
  { value: 'delegation', label: 'Delegation' },
  { value: 'debug_request', label: 'Debug Request' },
  { value: 'discussion', label: 'Discussion' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
];

export default function ComposePage() {
  const router = useRouter();
  const { agents } = useAgentStore();
  const [fromAgentId, setFromAgentId] = useState('');
  const [toAgentId, setToAgentId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('message');
  const [priority, setPriority] = useState('normal');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (agents.length > 0 && !fromAgentId) {
      setFromAgentId(agents[0].id);
    }
  }, [agents, fromAgentId]);

  useEffect(() => {
    if (agents.length === 0) {
      api.agents.list({}).then(list => {
        useAgentStore.getState().setAgents(list as any[]);
      }).catch(() => {});
    }
  }, []);

  async function handleSend() {
    if (!fromAgentId || !toAgentId || !subject.trim() || !body.trim()) return;
    setSending(true);
    try {
      await api.agentMessages.send({ fromAgentId, toAgentId, subject, body, type, priority });
      setSent(true);
    } catch { /* ignore */ }
    setSending(false);
  }

  const filteredAgents = (agents as any[])?.filter(a => a.id !== fromAgentId) || [];

  if (sent) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <Card className="bg-zinc-950 border-zinc-800 p-8 text-center max-w-md">
          <CheckCircle2 size={48} className="text-green-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Message Sent</h2>
          <p className="text-sm text-zinc-400 mb-4">Your message has been delivered to the agent's inbox.</p>
          <div className="flex gap-2 justify-center">
            <Button variant="secondary" onClick={() => { setSent(false); setSubject(''); setBody(''); setToAgentId(''); }}>
              Compose Another
            </Button>
            <Link href="/agent-messages"><Button>Back to Inbox</Button></Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/agent-messages">
          <Button variant="ghost" size="sm"><ArrowLeft size={14} /></Button>
        </Link>
        <h1 className="text-xl font-semibold text-white flex items-center gap-2">
          <Send size={20} className="text-blue-400" /> Compose Message
        </h1>
      </div>

      <Card className="bg-zinc-950 border-zinc-800">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">From</label>
              <select
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
                value={fromAgentId}
                onChange={e => setFromAgentId(e.target.value)}
              >
                {(agents as any[])?.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.displayName || a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">To</label>
              <select
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
                value={toAgentId}
                onChange={e => setToAgentId(e.target.value)}
              >
                <option value="">Select agent...</option>
                {filteredAgents.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.displayName || a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Subject</label>
            <input
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
              placeholder="Subject..."
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Type</label>
              <select
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
                value={type}
                onChange={e => setType(e.target.value)}
              >
                {MESSAGE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Priority</label>
              <select
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
                value={priority}
                onChange={e => setPriority(e.target.value)}
              >
                {PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Message Body (Markdown supported)</label>
            <textarea
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white resize-none h-48 font-mono"
              placeholder="Write your message in Markdown..."
              value={body}
              onChange={e => setBody(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Link href="/agent-messages">
              <Button variant="ghost">Cancel</Button>
            </Link>
            <Button onClick={handleSend} disabled={sending || !toAgentId || !subject.trim() || !body.trim()}>
              {sending ? <Loader2 size={14} className="animate-spin mr-1" /> : <Send size={14} className="mr-1" />}
              Send
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
