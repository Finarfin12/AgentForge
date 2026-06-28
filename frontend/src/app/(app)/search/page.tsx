'use client';
import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/Spinner';
import Link from 'next/link';
import { Search as SearchIcon, Bot, ListTodo, MessageSquare, Workflow, ArrowRight } from 'lucide-react';

const typeConfig: Record<string, { icon: any; href: (id: string) => string; color: string }> = {
  agent: { icon: Bot, href: (id) => `/agents/${id}`, color: 'text-green-400' },
  task: { icon: ListTodo, href: (id) => `/tasks/${id}`, color: 'text-blue-400' },
  thread: { icon: MessageSquare, href: (id) => `/threads`, color: 'text-purple-400' },
  pipeline: { icon: Workflow, href: (id) => `/pipelines/${id}`, color: 'text-orange-400' },
};

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null as any);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      setSearched(true);
      try {
        const data = await api.search.all(query);
        setResults(data as any[]);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }, 300);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [query]);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold text-white">Search</h1>
      <div className="relative">
        <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search agents, tasks, threads, pipelines..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-11 pr-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
        />
      </div>

      <div className="space-y-2">
        {loading && <Spinner />}
        {!loading && searched && results.length === 0 && (
          <p className="text-zinc-500 text-sm text-center py-8">No results for &ldquo;{query}&rdquo;</p>
        )}
        {results.map((r) => {
          const config = typeConfig[r.type] || typeConfig.task;
          const Icon = config.icon;
          return (
            <Link key={`${r.type}-${r.id}`} href={config.href(r.id)}>
              <Card className="bg-zinc-950 border-zinc-800 hover:border-zinc-700 transition-colors">
                <CardContent className="p-4 flex items-center gap-3">
                  <Icon size={18} className={config.color} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{r.name}</p>
                    {r.description && <p className="text-xs text-zinc-500 truncate mt-0.5">{r.description}</p>}
                    <p className="text-xs text-zinc-600 mt-0.5 capitalize">{r.type}</p>
                  </div>
                  <ArrowRight size={14} className="text-zinc-600" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
