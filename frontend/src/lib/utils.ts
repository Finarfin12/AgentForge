import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { AgentStatus, TaskStatus } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function agentStatusColor(status: AgentStatus) {
  return {
    idle: 'bg-green-500',
    busy: 'bg-yellow-500',
    offline: 'bg-zinc-400',
    error: 'bg-red-500',
  }[status] ?? 'bg-zinc-400';
}

export function taskStatusColor(status: TaskStatus) {
  return {
    pending: 'text-zinc-400',
    assigned: 'text-blue-400',
    running: 'text-yellow-400',
    completed: 'text-green-400',
    failed: 'text-red-400',
    cancelled: 'text-zinc-500',
    delegated: 'text-purple-400',
  }[status] ?? 'text-zinc-400';
}

export function taskStatusBadge(status: TaskStatus) {
  return {
    pending: 'bg-zinc-800 text-zinc-300',
    assigned: 'bg-blue-900/60 text-blue-300',
    running: 'bg-yellow-900/60 text-yellow-300',
    completed: 'bg-green-900/60 text-green-300',
    failed: 'bg-red-900/60 text-red-300',
    cancelled: 'bg-zinc-800 text-zinc-500',
    delegated: 'bg-purple-900/60 text-purple-300',
  }[status] ?? 'bg-zinc-800 text-zinc-400';
}

export function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(iso?: string) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diff);
  const s = Math.floor(abs / 1000);
  const suffix = diff >= 0 ? 'ago' : 'from now';
  if (s < 60) return `${s}s ${suffix}`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${suffix}`;
  const h = Math.floor(m / 60);
  return `${h}h ${suffix}`;
}
