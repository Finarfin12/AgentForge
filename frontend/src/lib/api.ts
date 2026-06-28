const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem('auth');
    if (!data) return null;
    const parsed = JSON.parse(data);
    return parsed?.state?.token || null;
  } catch { return null; }
}

async function fetchWithError(input: RequestInfo, init?: RequestInit): Promise<Response> {
  try { return await fetch(input, init); }
  catch (err) {
    if (err instanceof TypeError && (err as Error).message === 'Failed to fetch')
      throw new Error('Cannot reach the backend. Make sure the backend server is running:\n  cd backend && npm run start:dev\nAlso ensure PostgreSQL and Redis are running:\n  docker-compose up -d');
    throw err;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetchWithError(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth');
      if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
    }
    const err = await res.text();
    throw new Error(`${res.status}: ${err}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  auth: {
    login: (identifier: string, password: string) => request<{ user: unknown; token: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }),
    register: (body: { email: string; username: string; password: string; displayName?: string }) => request<{ user: unknown; token: string }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    me: () => request<unknown>('/auth/me'),
    forgotPassword: (email: string) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: (data: { token: string; newPassword: string }) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),
  },

  agents: {
    list: (params?: { search?: string; isActive?: boolean }) => {
      const q = new URLSearchParams();
      if (params?.search) q.set('search', params.search);
      if (params?.isActive !== undefined) q.set('isActive', String(params.isActive));
      return request<any[]>(`/agents?${q}`);
    },
    get: (id: string) => request<any>(`/agents/${id}`),
    create: (body: any) => request<any>('/agents', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => request<any>(`/agents/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) => request<any>(`/agents/${id}`, { method: 'DELETE' }),
    heartbeat: (id: string) => request<any>(`/agents/${id}/heartbeat`, { method: 'POST' }),
    invoke: (id: string, body: { prompt: string; history?: { role: 'user' | 'assistant'; content: string }[]; maxTokens?: number; temperature?: number }) =>
      request<any>(`/agents/${id}/invoke`, { method: 'POST', body: JSON.stringify(body) }),
    invokeStream: (id: string, body: { prompt: string; history?: { role: 'user' | 'assistant'; content: string }[]; maxTokens?: number; temperature?: number }, abortSignal?: AbortSignal): AsyncGenerator<any> => {
      const token = getToken();
      return (async function* () {
        const res = await fetchWithError(`${BASE_URL}/agents/${id}/invoke/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(body),
          signal: abortSignal,
        });
        if (!res.ok) {
          if (res.status === 401 && typeof window !== 'undefined') { localStorage.removeItem('auth'); if (!window.location.pathname.startsWith('/login')) window.location.href = '/login'; }
          const err = await res.text(); throw new Error(`${res.status}: ${err}`);
        }
        const reader = res.body?.getReader(); if (!reader) throw new Error('No response body');
        const decoder = new TextDecoder(); let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split('\n\n'); buffer = events.pop() || '';
            for (const event of events) {
              const lines = event.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) { try { const data = JSON.parse(line.slice(6)); yield data; } catch {} }
              }
            }
          }
        } finally { reader.releaseLock(); }
      })();
    },
    discover: () => request<{ discovered: number; registered: any[] }>('/agents/discover', { method: 'POST' }),
  },

  runtimes: {
    list: () => request<any[]>('/runtimes'),
    get: (id: string) => request<any>(`/runtimes/${id}`),
    register: (body: { name: string; provider: string; mode?: string; daemonId?: string; deviceName?: string; version?: string; metadata?: any }) =>
      request<any>('/runtimes/register', { method: 'POST', body: JSON.stringify(body) }),
    heartbeat: (id: string) => request<any>(`/runtimes/${id}/heartbeat`, { method: 'POST' }),
    detect: () => request<{ name: string; path: string; provider: string; version: string }[]>('/runtimes/detect'),
    stats: () => request<{ total: number; online: number; providers: any[] }>('/runtimes/stats'),
    delete: (id: string) => request(`/runtimes/${id}`, { method: 'DELETE' }),
  },

  squads: {
    list: (scope?: string) => request<any[]>(`/squads${scope ? `?scope=${scope}` : ''}`),
    get: (id: string) => request<any>(`/squads/${id}`),
    create: (body: { name: string; description?: string; instructions?: string; leaderId: string; avatarUrl?: string }) =>
      request<any>('/squads', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: { name?: string; description?: string; instructions?: string; leaderId?: string; avatarUrl?: string }) =>
      request<any>(`/squads/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) => request(`/squads/${id}`, { method: 'DELETE' }),
    archive: (id: string) => request(`/squads/${id}/archive`, { method: 'POST' }),
    restore: (id: string) => request(`/squads/${id}/restore`, { method: 'POST' }),
    addMember: (id: string, agentId: string, role?: string) =>
      request(`/squads/${id}/members`, { method: 'POST', body: JSON.stringify({ agentId, role }) }),
    removeMember: (id: string, agentId: string) =>
      request(`/squads/${id}/members/${agentId}`, { method: 'DELETE' }),
    memberStatus: (id: string) => request<any[]>(`/squads/${id}/members/status`),
  },

  autopilots: {
    list: (status?: string) => request<any[]>(`/autopilots${status ? `?status=${status}` : ''}`),
    get: (id: string) => request<any>(`/autopilots/${id}`),
    create: (body: { name: string; description?: string; assigneeType?: string; assigneeId: string; executionMode?: string; issueTitleTemplate?: string }) =>
      request<any>('/autopilots', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: { name?: string; description?: string; status?: string; assigneeType?: string; assigneeId?: string; executionMode?: string }) =>
      request<any>(`/autopilots/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) => request(`/autopilots/${id}`, { method: 'DELETE' }),
    toggle: (id: string) => request(`/autopilots/${id}/toggle`, { method: 'POST' }),
    dispatch: (id: string) => request(`/autopilots/${id}/dispatch`, { method: 'POST' }),
    stats: () => request<{ total: number; active: number; totalRuns: number }>('/autopilots/stats'),
    addTrigger: (id: string, body: { kind: 'schedule' | 'webhook'; cronExpression?: string; timezone?: string; label?: string }) =>
      request<any>(`/autopilots/${id}/triggers`, { method: 'POST', body: JSON.stringify(body) }),
    updateTrigger: (triggerId: string, body: { enabled?: boolean; cronExpression?: string; timezone?: string; label?: string }) =>
      request<any>(`/autopilots/triggers/${triggerId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deleteTrigger: (triggerId: string) => request(`/autopilots/triggers/${triggerId}`, { method: 'DELETE' }),
    getRuns: (id: string) => request<any[]>(`/autopilots/${id}/runs`),
  },

  skills: {
    list: (params?: { origin?: string; agentId?: string }) => {
      const q = new URLSearchParams();
      if (params?.origin) q.set('origin', params.origin);
      if (params?.agentId) q.set('agentId', params.agentId);
      return request<any[]>(`/skills?${q}`);
    },
    get: (id: string) => request<any>(`/skills/${id}`),
    create: (body: { name: string; description?: string; content?: string; config?: any; origin?: string }) =>
      request<any>('/skills', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: { name?: string; description?: string; content?: string; config?: any }) =>
      request<any>(`/skills/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) => request(`/skills/${id}`, { method: 'DELETE' }),
    search: (q: string) => request<any[]>(`/skills/search?q=${encodeURIComponent(q)}`),
    stats: () => request<{ total: number; byOrigin: any[] }>('/skills/stats'),
    addFile: (id: string, body: { path: string; content: string }) =>
      request<any>(`/skills/${id}/files`, { method: 'POST', body: JSON.stringify(body) }),
    removeFile: (fileId: string) => request(`/skills/files/${fileId}`, { method: 'DELETE' }),
    assignToAgent: (skillId: string, agentId: string) =>
      request(`/skills/${skillId}/assign/${agentId}`, { method: 'POST' }),
    unassignFromAgent: (skillId: string, agentId: string) =>
      request(`/skills/${skillId}/assign/${agentId}`, { method: 'DELETE' }),
    getAgentSkills: (agentId: string) => request<any[]>(`/skills/agent/${agentId}`),
  },

  tasks: {
    list: (params?: { status?: string; assignedAgentId?: string }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set('status', params.status);
      if (params?.assignedAgentId) q.set('assignedAgentId', params.assignedAgentId);
      return request<any[]>(`/tasks?${q}`);
    },
    get: (id: string) => request<any>(`/tasks/${id}`),
    create: (body: any) => request<any>('/tasks', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => request<any>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    cancel: (id: string) => request<any>(`/tasks/${id}/cancel`, { method: 'POST' }),
    retry: (id: string) => request<any>(`/tasks/${id}/retry`, { method: 'POST' }),
    assign: (id: string, agentId: string) => request<any>(`/tasks/${id}/assign/${agentId}`, { method: 'POST' }),
  },

  discovery: {
    list: () => request<{ agents: any[] }>('/discovery'),
    scanLocal: () => request<any[]>('/discovery/scan', { method: 'POST' }),
    scanHost: (host: string, ports?: number[]) => request<any[]>('/discovery/scan/host', { method: 'POST', body: JSON.stringify({ host, ports }) }),
  },

  integrations: {
    listProviders: () => request('/integrations/providers'),
    healthCheckAll: () => request('/integrations/providers/health'),
    listModels: (provider: string) => request(`/integrations/providers/${provider}/models`),
  },

  threads: {
    list: () => request('/threads'),
    create: (data: { title: string; description?: string }) => request('/threads', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/threads/${id}`, { method: 'DELETE' }),
    getMessages: (id: string) => request(`/threads/${id}/messages`),
    addMessage: (id: string, data: { role: 'user' | 'agent' | 'system'; content: string; agentId?: string }) =>
      request(`/threads/${id}/messages`, { method: 'POST', body: JSON.stringify(data) }),
    startDeliberation: (id: string, data: { problemStatement: string; agentIds?: string[]; maxRounds?: number; timeoutSeconds?: number }) =>
      request(`/threads/${id}/deliberation/start`, { method: 'POST', body: JSON.stringify(data) }),
    getDeliberationStatus: (id: string) => request(`/threads/${id}/deliberation/status`),
  },

  users: {
    list: () => request<any[]>('/users'),
    get: (id: string) => request<any>(`/users/${id}`),
    update: (id: string, body: { role?: string; displayName?: string }) => request<any>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) => request<{ deleted: string }>(`/users/${id}`, { method: 'DELETE' }),
  },

  logs: {
    list: (params?: { page?: number; limit?: number; level?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.level && params.level !== 'all') q.set('level', params.level);
      if (params?.search) q.set('search', params.search);
      return request<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>(`/logs?${q}`);
    },
  },

  search: { all: (q: string) => request<{ id: string; name: string; type: string; description?: string }[]>(`/search?q=${encodeURIComponent(q)}`) },

  agentMessages: {
    inbox: (agentId: string) => request<any[]>(`/agent-messages/inbox?agentId=${agentId}`),
    sent: (agentId: string) => request<any[]>(`/agent-messages/sent?agentId=${agentId}`),
    thread: (threadId: string) => request<any[]>(`/agent-messages/thread/${threadId}`),
    get: (id: string) => request<any>(`/agent-messages/${id}`),
    send: (data: { fromAgentId: string; toAgentId: string; subject: string; body: string; type?: string; priority?: string; relatedTaskId?: string }) =>
      request<any>('/agent-messages/send', { method: 'POST', body: JSON.stringify(data) }),
    reply: (id: string, data: { fromAgentId: string; toAgentId: string; subject: string; body: string; type?: string }) =>
      request<any>(`/agent-messages/${id}/reply`, { method: 'POST', body: JSON.stringify(data) }),
    markRead: (id: string, agentId: string) => request<any>(`/agent-messages/${id}/read?agentId=${agentId}`, { method: 'PATCH' }),
    archive: (id: string, agentId: string) => request<any>(`/agent-messages/${id}/archive?agentId=${agentId}`, { method: 'PATCH' }),
    unreadCount: (agentId: string) => request<{ count: number }>(`/agent-messages/unread-count?agentId=${agentId}`),
  },

  reviews: {
    listByAgent: (agentId: string) => request<any[]>(`/reviews/agent/${agentId}`),
    stats: (agentId: string) => request<{ avgRating: number; totalReviews: number }>(`/reviews/agent/${agentId}/stats`),
    create: (body: { agentId: string; rating: number; title?: string; review?: string }) => request<any>('/reviews', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: { rating?: number; title?: string; review?: string }) => request<any>(`/reviews/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) => request(`/reviews/${id}`, { method: 'DELETE' }),
  },

  settings: {
    list: () => request<any[]>('/settings'),
    getByCategory: (cat: string) => request<any[]>(`/settings/category/${cat}`),
    getKey: (key: string) => request<any>(`/settings/${key}`),
    setKey: (key: string, body: { value: any; category?: string; description?: string }) => request<any>(`/settings/${key}`, { method: 'PUT', body: JSON.stringify(body) }),
    getProfile: () => request<Record<string, any>>('/settings/profile/me'),
    updateProfile: (prefs: Record<string, any>) => request<Record<string, any>>('/settings/profile/me', { method: 'PUT', body: JSON.stringify(prefs) }),
  },

  mesh: {
    nodes: () => request<{ nodes: any[]; count: number }>('/mesh/nodes'),
    getNode: (id: string) => request<any>(`/mesh/nodes/${id}`),
    send: (to: string, type: string, payload: any) => request('/mesh/send', { method: 'POST', body: JSON.stringify({ to, type, payload }) }),
    broadcast: (type: string, payload: any) => request('/mesh/broadcast', { method: 'POST', body: JSON.stringify({ type, payload }) }),
  },

  plugins: {
    list: () => request<{ plugins: any[] }>('/plugins'),
    get: (name: string) => request<any>(`/plugins/${name}`),
    reload: (name: string) => request<any>(`/plugins/${name}/reload`, { method: 'POST' }),
    toggle: (name: string, enabled: boolean) => request<any>(`/plugins/${name}/toggle`, { method: 'POST', body: JSON.stringify({ enabled }) }),
  },

  marketplace: {
    search: (q: string) => request<any[]>('/marketplace/search?q=' + encodeURIComponent(q)),
    import: (repo: string) => request<any>('/marketplace/import', { method: 'POST', body: JSON.stringify({ repo }) }),
  },

  pipelines: {
    list: () => request<any[]>('/pipelines'),
    get: (id: string) => request<any>(`/pipelines/${id}`),
    create: (data: { name: string; description?: string }) => request('/pipelines', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; description?: string }) => request(`/pipelines/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/pipelines/${id}`, { method: 'DELETE' }),
    getSteps: (id: string) => request<any[]>(`/pipelines/${id}/steps`),
    addStep: (id: string, data: { name: string; description?: string; agentId: string; config: { prompt: string } }) =>
      request(`/pipelines/${id}/steps`, { method: 'POST', body: JSON.stringify(data) }),
    removeStep: (id: string, stepId: string) => request(`/pipelines/${id}/steps/${stepId}`, { method: 'DELETE' }),
    execute: (id: string, input: string) => request(`/pipelines/${id}/execute`, { method: 'POST', body: JSON.stringify({ input }) }),
    getExecutions: (id: string) => request<any[]>(`/pipelines/${id}/executions`),
    getTemplates: () => request<any[]>('/pipelines/templates/all'),
    saveAsTemplate: (id: string, templateName: string) => request<any>(`/pipelines/${id}/save-template`, { method: 'POST', body: JSON.stringify({ templateName }) }),
    createFromTemplate: (templateId: string, name: string) => request<any>(`/pipelines/from-template/${templateId}`, { method: 'POST', body: JSON.stringify({ name }) }),
  },
};
