'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Terminal, Activity, Database, Server, Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null as any);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(() => {
      if (autoRefresh) fetchLogs();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, page, levelFilter]);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(1);
      fetchLogs();
    }, 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchQuery]);

  async function fetchLogs() {
    try {
      const data = await api.logs.list({ page, limit: 50, level: levelFilter, search: searchQuery || undefined });
      setLogs(data?.data as any[] ?? []);
      setTotalPages(data?.totalPages ?? 1);
      setTotalLogs(data?.total ?? 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (scrollRef.current && page === totalPages) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, page, totalPages]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'debug': return 'text-zinc-500';
      default: return 'text-blue-400';
    }
  };

  return (
    <div className="p-6 space-y-6 h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-white">Logs & Monitoring</h1>
          <p className="text-sm text-zinc-500 mt-0.5">System execution traces and metrics</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? 'secondary' : 'ghost'}
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50' : ''}
          >
            <Activity size={14} className="mr-2" />
            {autoRefresh ? 'Auto-Refresh: ON' : 'Auto-Refresh: OFF'}
          </Button>
          <Button variant="secondary" onClick={fetchLogs}><RefreshCw size={14} /></Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 shrink-0">
        <Card className="bg-zinc-950 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-900/20 flex items-center justify-center">
              <Server size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">System Status</p>
              <p className="text-lg font-semibold text-white flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${totalLogs > 0 ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'} flex-shrink-0`}></span> {totalLogs > 0 ? 'Online' : 'Idle'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-950 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-900/20 flex items-center justify-center">
              <Terminal size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Total Logs Recorded</p>
              <p className="text-lg font-semibold text-white">{totalLogs}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-950 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-orange-900/20 flex items-center justify-center">
              <Database size={20} className="text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Page</p>
              <p className="text-lg font-semibold text-white">{page} / {totalPages}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="flex gap-1 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
          {['all', 'info', 'warn', 'error'].map((level) => (
            <button
              key={level}
              onClick={() => { setLevelFilter(level); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                levelFilter === level
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {level === 'all' ? 'All' : level}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
          />
        </div>
      </div>

      <Card className="flex-1 bg-black border-zinc-800 flex flex-col overflow-hidden font-mono text-sm">
        <div className="border-b border-zinc-800 p-2 flex items-center gap-2 bg-zinc-950/50">
          <Terminal size={14} className="text-zinc-500" />
          <span className="text-zinc-400 text-xs">system_tail.log</span>
          <span className="ml-auto text-zinc-600 text-xs">{totalLogs} total entries</span>
        </div>
        <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
          <div className="flex-1 p-4 overflow-y-auto" ref={scrollRef}>
          {loading && (!logs || logs.length === 0) ? (
            <div className="text-zinc-600 animate-pulse">Waiting for logs...</div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-zinc-600">No logs match the current filter.</div>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-3 hover:bg-zinc-900/30 px-2 py-1 rounded">
                  <span className="text-zinc-600 shrink-0 w-24">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className={`shrink-0 w-12 uppercase text-xs font-semibold ${getLevelColor(log.level)}`}>
                    {log.level}
                  </span>
                  <span className="text-purple-400 shrink-0 w-24 truncate">
                    [{log.source}]
                  </span>
                  <span className="text-zinc-300 whitespace-pre-wrap break-all">
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          )}
          </div>
          {totalPages > 1 && (
            <div className="border-t border-zinc-800 p-2 flex items-center justify-between bg-zinc-950/50">
              <span className="text-xs text-zinc-600">Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 text-zinc-400"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 text-zinc-400"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
