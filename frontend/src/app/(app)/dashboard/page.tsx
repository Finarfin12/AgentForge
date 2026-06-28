'use client';
import { Spinner } from '@/components/Spinner';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAgentStore, useTaskStore } from '@/lib/store';
import { useAgentSocket } from '@/lib/socket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { agentStatusColor, taskStatusBadge, timeAgo } from '@/lib/utils';
import Link from 'next/link';
import { Bot, ListTodo, CheckCircle, AlertCircle, Activity, ExternalLink, BarChart3, PieChart, TrendingUp, GitBranch, Clock, BrainCircuit } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import type { Agent, Task } from '@/lib/types';

const PIE_COLORS = ['#22c55e', '#eab308', '#3b82f6', '#ef4444', '#a855f7', '#6b7280'];

export default function DashboardPage() {
  const { agents, setAgents } = useAgentStore();
  const { tasks, setTasks } = useTaskStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [squadsCount, setSquadsCount] = useState(0);
  const [autopilotsCount, setAutopilotsCount] = useState(0);
  const [skillsCount, setSkillsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useAgentSocket();

  const fetchData = useCallback(() => {
    Promise.all([
      api.agents.list().then((r) => setAgents(r as Agent[])).catch(() => []),
      api.tasks.list().then((r) => setTasks(r as Task[])).catch(() => []),
      api.logs.list({ limit: 5 }).then((r) => setLogs(r?.data as any[] ?? [])).catch(() => []),
      api.pipelines.list().then((r) => setPipelines(r as any[])).catch(() => []),
      api.squads.list().then((r: any) => setSquadsCount(r.length)).catch(() => 0),
      api.autopilots.list().then((r: any) => setAutopilotsCount(r.length)).catch(() => 0),
      api.skills.list().then((r: any) => setSkillsCount(r.length)).catch(() => 0),
    ]).finally(() => setLoading(false));
  }, [setAgents, setTasks]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const activeAgents = agents.filter((a) => a.status !== 'offline').length;
  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
  const runningTasks = tasks.filter((t) => t.status === 'running').length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const failedTasks = tasks.filter((t) => t.status === 'failed').length;

  const recentTasks = [...tasks].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 8);

  const taskStatusData = [
    { name: 'Completed', value: completedTasks, color: '#22c55e' },
    { name: 'Running', value: runningTasks, color: '#eab308' },
    { name: 'Pending', value: pendingTasks, color: '#3b82f6' },
    { name: 'Failed', value: failedTasks, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const agentTasksData = agents.slice(0, 10).map(a => ({
    name: a.displayName?.length > 12 ? a.displayName.slice(0, 12) + '...' : a.displayName,
    tasks: a.totalTasksCompleted || 0,
    avgTime: a.avgResponseTimeMs || 0,
  }));

  const timelineData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStart = new Date(d.setHours(0, 0, 0, 0));
    const dayEnd = new Date(d.setHours(23, 59, 59, 999));
    const count = tasks.filter(t => {
      const created = new Date(t.createdAt).getTime();
      return created >= dayStart.getTime() && created <= dayEnd.getTime();
    }).length;
    return {
      day: dayStart.toLocaleDateString('en', { weekday: 'short' }),
      tasks: count,
    };
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-0.5">System overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Agents', value: activeAgents, total: agents.length, icon: Bot, color: 'text-green-400' },
          { label: 'Running', value: runningTasks, icon: Activity, color: 'text-yellow-400' },
          { label: 'Pending', value: pendingTasks, icon: ListTodo, color: 'text-blue-400' },
          { label: 'Completed', value: completedTasks, icon: CheckCircle, color: 'text-green-400' },
          { label: 'Failed', value: failedTasks, icon: AlertCircle, color: 'text-red-400' },
          { label: 'Squads', value: squadsCount, icon: GitBranch, color: 'text-indigo-400' },
          { label: 'Autopilots', value: autopilotsCount, icon: Clock, color: 'text-amber-400' },
          { label: 'Skills', value: skillsCount, icon: BrainCircuit, color: 'text-cyan-400' },
        ].map(({ label, value, total, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 py-4">
              <Icon size={20} className={color} />
              <div>
                <p className="text-2xl font-bold text-white">
                  {loading ? '—' : value}
                  {total !== undefined && !loading && (
                    <span className="text-sm text-zinc-500 font-normal">/{total}</span>
                  )}
                </p>
                <p className="text-xs text-zinc-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><PieChart size={16} className="text-purple-400" /> Task Distribution</CardTitle></CardHeader>
          <CardContent className="py-3">
            {loading ? <Spinner /> : taskStatusData.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">No tasks yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <RePieChart>
                  <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {taskStatusData.map((entry, i) => (
                      <Cell key={entry.name} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa' }} />
                </RePieChart>
              </ResponsiveContainer>
            )}
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {taskStatusData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  {d.name}: {d.value}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><BarChart3 size={16} className="text-blue-400" /> Agent Tasks Completed</CardTitle></CardHeader>
          <CardContent className="py-3">
            {loading ? <Spinner /> : agentTasksData.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">No agent data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={agentTasksData} barCategoryGap="20%">
                  <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa' }} />
                  <Bar dataKey="tasks" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><TrendingUp size={16} className="text-green-400" /> Tasks (Last 7 Days)</CardTitle></CardHeader>
          <CardContent className="py-3">
            {loading ? <Spinner /> : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="day" tick={{ fill: '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa' }} />
                  <Line type="monotone" dataKey="tasks" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Agents</CardTitle></CardHeader>
          <CardContent className="space-y-2 py-3">
            {loading ? (
              <Spinner />
            ) : agents.length === 0 ? (
              <p className="text-sm text-zinc-500">No agents registered.</p>
            ) : agents.map((a) => (
              <Link key={a.id} href="/agents" className="flex items-center gap-3 py-1.5 hover:bg-zinc-900/50 rounded px-2 -mx-2 transition-colors group">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${agentStatusColor(a.status)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate group-hover:text-purple-400 transition-colors">{a.displayName}</p>
                  <p className="text-xs text-zinc-500">{a.currentTaskCount}/{a.maxConcurrentTasks} tasks</p>
                </div>
                <span className="text-xs text-zinc-500 flex items-center gap-1">{timeAgo(a.lastHeartbeatAt)} <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" /></span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
          <CardContent className="space-y-2 py-3">
            {loading ? (
              <Spinner />
            ) : recentTasks.length === 0 ? (
              <p className="text-sm text-zinc-500">No tasks yet.</p>
            ) : recentTasks.map((t) => (
              <Link key={t.id} href={`/tasks/${t.id}`} className="flex items-center gap-3 py-1.5 border-b border-zinc-800/50 last:border-0 hover:bg-zinc-900/30 rounded px-2 -mx-2 transition-colors group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate group-hover:text-purple-400 transition-colors">{t.title}</p>
                  <p className="text-xs text-zinc-500">{timeAgo(t.createdAt)}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${taskStatusBadge(t.status)}`}>
                  {t.status}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-red-900/30">
          <CardHeader><CardTitle className="text-red-400 flex items-center gap-2"><AlertCircle size={16}/> Errors & Warnings</CardTitle></CardHeader>
          <CardContent className="space-y-2 py-3 text-sm">
             {loading ? <Spinner /> : logs.filter(l => l.level === 'error' || l.level === 'warn').length === 0 ? <p className="text-zinc-500">No recent errors.</p> : logs.filter(l => l.level === 'error' || l.level === 'warn').slice(0, 5).map(log => (
               <div key={log.id} className={`flex items-start gap-2 p-2 rounded ${log.level === 'error' ? 'text-red-400 bg-red-400/10' : 'text-yellow-500 bg-yellow-500/10'}`}>
                 <span className="font-bold">{log.level === 'error' ? '✕' : '!'}</span>
                 <p>{log.message}</p>
               </div>
             ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Active Pipelines</CardTitle></CardHeader>
          <CardContent className="space-y-4 py-3">
             {loading ? <Spinner /> : pipelines.length === 0 ? <p className="text-zinc-500 text-sm">No active pipelines.</p> : pipelines.slice(0,5).map(pipe => {
               const percent = pipe.totalSteps > 0 ? Math.round((pipe.currentStepIndex / pipe.totalSteps) * 100) : 0;
               return (
                 <div key={pipe.id} className="space-y-1">
                   <div className="flex justify-between text-xs text-zinc-400">
                     <span>{pipe.name}</span>
                     <span>{percent}%</span>
                   </div>
                   <div className="h-1.5 bg-zinc-800 rounded overflow-hidden">
                     <div className="h-full bg-blue-500" style={{ width: `${percent}%` }}></div>
                   </div>
                 </div>
               )
             })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
