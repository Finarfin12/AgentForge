'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Bot, ListTodo, Search, Puzzle, Radar, LogOut, Workflow,
  MessageSquare, ActivitySquare, Sun, Moon, Users, Shield, Bell, Mail,
  GitBranch, Clock, BrainCircuit, Cpu, Star, ShoppingBag, Activity, Settings, Box,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { useLocale } from '@/components/LocaleProvider';

const groups = [
  {
    nameKey: 'workspace',
    items: [
      { href: '/dashboard', key: 'dashboard', icon: LayoutDashboard },
      { href: '/agents', key: 'agents', icon: Bot },
      { href: '/tasks', key: 'tasks', icon: ListTodo },
      { href: '/pipelines', key: 'pipelines', icon: Workflow },
      { href: '/squads', key: 'squads', icon: GitBranch },
      { href: '/autopilots', key: 'autopilots', icon: Clock },
      { href: '/skills', key: 'skills', icon: BrainCircuit },
      { href: '/mesh', key: 'mesh', icon: Activity },
      { href: '/threads', key: 'threads', icon: MessageSquare },
      { href: '/agent-messages', key: 'inbox', icon: Mail },
    ],
  },
  {
    nameKey: 'discovery',
    items: [
      { href: '/search', key: 'search', icon: Search },
      { href: '/discovery', key: 'network_scan', icon: Radar },
      { href: '/integrations', key: 'integrations', icon: Puzzle },
      { href: '/runtimes', key: 'runtimes', icon: Cpu },
      { href: '/marketplace', key: 'marketplace', icon: ShoppingBag },
      { href: '/plugins', key: 'plugins', icon: Box },
    ],
  },
  {
    nameKey: 'monitor',
    items: [
      { href: '/notifications', key: 'notifications', icon: Bell },
      { href: '/logs', key: 'logs', icon: ActivitySquare },
      { href: '/reviews', key: 'reviews', icon: Star },
    ],
  },
  {
    nameKey: 'configure',
    items: [
      { href: '/settings', key: 'settings', icon: Settings },
      { href: '/users', key: 'users', icon: Users },
      { href: '/audit', key: 'audit', icon: Shield },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const { theme, setTheme } = useTheme();
  const { t } = useLocale();
  const [mounted, setMounted] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    async function fetchUnread() {
      try {
        const agentsList = await api.agents.list({ isActive: true });
        if ((agentsList as any[]).length > 0) {
          const c = await api.agentMessages.unreadCount((agentsList as any[])[0].id);
          setUnread(c.count);
        }
      } catch {}
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="flex flex-col w-56 min-h-screen bg-zinc-950 border-r border-zinc-800 py-4">
      <div className="px-4 mb-6">
        <span className="text-lg font-bold text-white tracking-tight">AgentForge</span>
        <p className="text-xs text-zinc-500 mt-0.5">Orchestration Suite</p>
      </div>
      <nav className="flex-1 px-2 space-y-4 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.nameKey}>
            <p className="px-3 mb-1 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">{t(`sidebar.${group.nameKey}`)}</p>
            <div className="space-y-0.5">
              {group.items.map(({ href, key, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    pathname.startsWith(href)
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  )}
                >
                  <Icon size={16} />
                  {t(`sidebar.${key}`)}
                  {href === '/agent-messages' && unread > 0 && (
                    <span className="ml-auto bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-2 pt-2 border-t border-zinc-800 mt-2">
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
        >
          {mounted && theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          {mounted ? t(`sidebar.${theme === 'light' ? 'dark' : 'light'}`) : t('sidebar.theme')}
        </button>
      </div>
      <div className="px-2 pt-2 border-t border-zinc-800">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-white font-medium">
            {user?.username?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white truncate">{user?.username ?? 'User'}</p>
            <p className="text-xs text-zinc-500 truncate">{user?.role ?? 'user'}</p>
          </div>
          <button onClick={logout} className="text-zinc-500 hover:text-red-400 transition-colors" title="Logout">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
