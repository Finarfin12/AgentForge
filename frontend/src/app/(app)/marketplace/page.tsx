'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppAlert } from '@/lib/alert';
import { Search, Download, Star, GitFork, Loader2 } from 'lucide-react';

export default function MarketplacePage() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.marketplace.search(query);
      setItems(res as any[]);
    } catch (err) {
      AppAlert.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(fullName: string) {
    setImporting(fullName);
    try {
      const skill = await api.marketplace.import(fullName);
      AppAlert.success(`Imported "${skill.name}"`);
    } catch (err) {
      AppAlert.error((err as Error).message);
    } finally {
      setImporting(null);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white flex items-center gap-2">
          <Search size={18} /> Skill Marketplace
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">Browse and import skills from GitHub</p>
      </div>

      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search skills (e.g., web-search, code-review)..."
          className="flex-1"
        />
        <Button onClick={handleSearch} loading={loading}>
          <Search size={14} /> Search
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-zinc-500" />
        </div>
      ) : items.length === 0 && searched ? (
        <p className="text-sm text-zinc-400 text-center py-8">No results found. Try a different search term.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((item: any) => (
            <Card key={item.id} className="bg-zinc-950 border-zinc-800">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-sm">{item.name}</CardTitle>
                    <p className="text-xs text-zinc-500 font-mono truncate">{item.fullName}</p>
                  </div>
                  <Button size="sm" onClick={() => handleImport(item.fullName)} loading={importing === item.fullName}>
                    <Download size={12} /> Import
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {item.description && (
                  <p className="text-xs text-zinc-400 line-clamp-2">{item.description}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-1"><Star size={12} /> {item.stars}</span>
                  {item.language && <span>{item.language}</span>}
                </div>
                {item.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.topics.slice(0, 5).map((t: string) => (
                      <span key={t} className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{t}</span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
