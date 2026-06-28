'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Agent, Task } from './types';

interface AuthStore {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'auth' }
  )
);

interface AgentStore {
  agents: Agent[];
  loading: boolean;
  setAgents: (agents: Agent[]) => void;
  updateAgent: (id: string, patch: Partial<Agent>) => void;
  setLoading: (v: boolean) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  agents: [],
  loading: false,
  setAgents: (agents) => set({ agents }),
  updateAgent: (id, patch) =>
    set((s) => ({
      agents: s.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    })),
  setLoading: (loading) => set({ loading }),
}));

interface TaskStore {
  tasks: Task[];
  loading: boolean;
  setTasks: (tasks: Task[]) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  setLoading: (v: boolean) => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  loading: false,
  setTasks: (tasks) => set({ tasks }),
  updateTask: (id, patch) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),
  setLoading: (loading) => set({ loading }),
}));
