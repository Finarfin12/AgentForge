'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Bot, MessageSquare, User, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { timeAgo } from '@/lib/utils';
import { useThreadSocket, subscribeToThread } from '@/lib/socket';

export function DeliberationCard({ threadId, onDeliberationUpdated }: { threadId: string, onDeliberationUpdated?: () => void }) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<string>('');

  // Establish WebSocket connection for real-time updates
  useThreadSocket();

  useEffect(() => {
    fetchStatus();

    // Subscribe to real-time deliberation events
    const unsub = subscribeToThread(threadId, (data) => {
      if (data.event === 'deliberation:agent:start') {
        setActiveAgent(data.agentName);
        setLastEvent(`agent:start`);
      } else if (data.event === 'deliberation:agent:done') {
        setLastEvent(`agent:done`);
        // Refresh to get latest data
        fetchStatus();
      } else if (data.event === 'deliberation:round:start') {
        setLastEvent(`round:start`);
        fetchStatus();
      } else if (data.event === 'deliberation:round:complete') {
        setLastEvent(`round:complete`);
        fetchStatus();
      } else if (data.event === 'deliberation:resolved' || data.event === 'deliberation:failed') {
        setActiveAgent(null);
        setLastEvent(data.event);
        fetchStatus();
        if (onDeliberationUpdated) onDeliberationUpdated();
      } else if (data.event === 'deliberation:started') {
        fetchStatus();
      }
    });

    // Fallback polling in case WebSocket fails
    const interval = setInterval(() => {
      if (status?.session && status.session.status !== 'resolved' && status.session.status !== 'failed') {
        fetchStatus();
      }
    }, 5000);
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [threadId]);

  async function fetchStatus() {
    try {
      const data: any = await api.threads.getDeliberationStatus(threadId);
      setStatus(data);
      if (onDeliberationUpdated) {
        onDeliberationUpdated();
      }
      if (data?.session && (data.session.status === 'resolved' || data.session.status === 'failed')) {
        setActiveAgent(null);
      }
    } catch {
      // Polling errors are expected during backend restarts; ignore silently
    } finally {
      setLoading(false);
    }
  }

  if (loading) return null;
  if (!status || !status.active || !status.session) return null;

  const { session, rounds } = status;
  const isResolved = session.status === 'resolved';
  const isFailed = session.status === 'failed';
  const inProgress = session.status === 'discussing' || session.status === 'initializing';

  return (
    <Card className="mb-4 bg-zinc-900 border-zinc-700">
      <CardContent className="p-4 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Bot size={16} className="text-purple-400" />
              Deliberation Session
              {isResolved && <Badge variant="default" className="bg-green-600 hover:bg-green-700 ml-2">Consensus Reached</Badge>}
              {isFailed && <Badge variant="error" className="ml-2">Failed</Badge>}
              {inProgress && <Badge variant="muted" className="ml-2 animate-pulse">In Progress</Badge>}
            </h3>
            <p className="text-sm text-zinc-400 mt-1">Topic: {session.problemStatement}</p>
          </div>
          <div className="text-xs text-zinc-500">
            Started {timeAgo(session.createdAt)}
          </div>
        </div>

        {inProgress && (
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>Round {session.currentRound} of {session.maxRounds}</span>
              <span>{Math.round((session.currentRound / session.maxRounds) * 100)}%</span>
            </div>
            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 transition-all duration-500" 
                style={{ width: `${(session.currentRound / session.maxRounds) * 100}%` }}
              />
            </div>
          </div>
        )}

        {inProgress && activeAgent && (
          <div className="flex items-center gap-2 text-sm text-zinc-400 animate-pulse">
            <Loader2 size={14} className="text-purple-400" />
            <span><strong className="text-purple-300">{activeAgent}</strong> is responding...</span>
          </div>
        )}

        {isResolved && session.consensusResult && (
          <div className="bg-green-950/30 border border-green-900 rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2 text-green-400 font-medium mb-2">
              <CheckCircle2 size={16} />
              Consensus Synthesis
            </div>
            <div className="prose prose-invert prose-zinc max-w-none text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {session.consensusResult.synthesis}
              </ReactMarkdown>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-zinc-400">
              <span>Solution: <strong className="text-white">{session.consensusResult.solution}</strong></span>
              <span>Agreement: <strong className="text-white">{Math.round((session.consensusResult.agreement || 0) * 100)}%</strong></span>
            </div>
          </div>
        )}

        {isFailed && (
          <div className="bg-red-950/30 border border-red-900 rounded-lg p-3 text-sm flex gap-2">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-200">
              Agents could not reach consensus within the maximum rounds.
            </p>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
