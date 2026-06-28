'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { StarRating } from '@/components/StarRating';
import { AppAlert } from '@/lib/alert';
import { Star, Trash2, MessageSquare } from 'lucide-react';

export default function ReviewsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Record<string, any[]>>({});
  const [stats, setStats] = useState<Record<string, { avgRating: number; totalReviews: number }>>({});
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [myRatings, setMyRatings] = useState<Record<string, number>>({});
  const [myReviews, setMyReviews] = useState<Record<string, { title: string; review: string }>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.agents.list().then(async (agents) => {
      setAgents(agents as any[]);
      const s: Record<string, any> = {};
      const r: Record<string, any[]> = {};
      for (const a of agents) {
        try {
          const stats = await api.reviews.stats(a.id);
          s[a.id] = stats as any;
        } catch {}
        try {
          const list = await api.reviews.listByAgent(a.id);
          r[a.id] = list as any[];
        } catch {}
      }
      setStats(s);
      setReviews(r);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleSubmit(agentId: string) {
    const rating = myRatings[agentId];
    if (!rating) { AppAlert.error('Please select a rating'); return; }
    setSubmitting(true);
    try {
      await api.reviews.create({ agentId, rating, ...myReviews[agentId] });
      AppAlert.success('Review submitted');
      const list = await api.reviews.listByAgent(agentId);
      setReviews({ ...reviews, [agentId]: list as any[] });
      const s = await api.reviews.stats(agentId);
      setStats({ ...stats, [agentId]: s as any });
    } catch (err) {
      AppAlert.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(reviewId: string, agentId: string) {
    try {
      await api.reviews.delete(reviewId);
      const list = await api.reviews.listByAgent(agentId);
      setReviews({ ...reviews, [agentId]: list as any[] });
      const s = await api.reviews.stats(agentId);
      setStats({ ...stats, [agentId]: s as any });
    } catch (err) {
      AppAlert.error((err as Error).message);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white flex items-center gap-2">
          <Star size={18} className="text-yellow-400" /> Reviews
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">Rate and review agents</p>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : agents.length === 0 ? (
        <p className="text-sm text-zinc-400">No agents to review.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {agents.map((agent) => {
            const agentStats = stats[agent.id];
            const agentReviews = reviews[agent.id] || [];
            return (
              <Card key={agent.id} className="bg-zinc-950 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {agent.displayName}
                    </CardTitle>
                    {agentStats && (
                      <div className="flex items-center gap-2">
                        <StarRating rating={Math.round(agentStats.avgRating)} size={12} />
                        <span className="text-xs text-zinc-500">
                          {agentStats.avgRating.toFixed(1)} ({agentStats.totalReviews})
                        </span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Submit review */}
                  <div className="bg-zinc-900 rounded-lg p-3 space-y-2">
                    <p className="text-xs text-zinc-400 font-medium">Your Review</p>
                    <StarRating rating={myRatings[agent.id] || 0} onChange={(r) => setMyRatings({ ...myRatings, [agent.id]: r })} size={18} interactive />
                    <input value={myReviews[agent.id]?.title || ''} onChange={(e) => setMyReviews({ ...myReviews, [agent.id]: { ...myReviews[agent.id], title: e.target.value } })}
                      placeholder="Review title..." className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200" />
                    <textarea value={myReviews[agent.id]?.review || ''} onChange={(e) => setMyReviews({ ...myReviews, [agent.id]: { ...myReviews[agent.id], review: e.target.value } })}
                      rows={2} placeholder="Write your review..." className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 resize-none" />
                    <Button size="sm" onClick={() => handleSubmit(agent.id)} loading={submitting}>Submit</Button>
                  </div>

                  {/* Existing reviews */}
                  {agentReviews.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-500 font-medium">{agentReviews.length} review(s)</p>
                      {agentReviews.map((r: any) => (
                        <div key={r.id} className="bg-zinc-900/50 rounded-lg px-3 py-2 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <StarRating rating={r.rating} size={10} />
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id, agent.id)}>
                              <Trash2 size={10} />
                            </Button>
                          </div>
                          {r.title && <p className="text-zinc-300 font-medium">{r.title}</p>}
                          {r.review && <p className="text-zinc-500">{r.review}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
