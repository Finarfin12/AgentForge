'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/Spinner';
import { RefreshCw, Bell, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { timeAgo } from '@/lib/utils';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchNotifications(); }, []);

  async function fetchNotifications() {
    try {
      const data = await api.logs.list({ page: 1, limit: 50 });
      const notifs = (data.data as any[]).filter(l => l.source === 'notification');
      setNotifications(notifs);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  if (loading) return <div className="p-6"><Spinner /></div>;

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Bell size={20} className="text-purple-400" /> Notifications
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">System alerts and updates</p>
        </div>
        <Button variant="secondary" onClick={fetchNotifications}><RefreshCw size={14} /></Button>
      </div>

      <div className="space-y-2">
        {notifications.length === 0 && (
          <Card className="bg-zinc-950 border-zinc-800">
            <CardContent className="p-8 text-center text-zinc-500">No notifications yet.</CardContent>
          </Card>
        )}
        {notifications.map((n) => (
          <Card key={n.id} className="bg-zinc-950 border-zinc-800 hover:border-zinc-700 transition-colors">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                <Bell size={14} className="text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{n.message}</p>
                <p className="text-xs text-zinc-500 mt-1">{timeAgo(n.createdAt)}</p>
              </div>
              <span className="text-xs text-zinc-600 shrink-0">{new Date(n.createdAt).toLocaleTimeString()}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
