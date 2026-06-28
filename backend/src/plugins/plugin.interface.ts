export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  hooks: string[];
}

export interface PluginApi {
  logger: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  };
  db: any;
  http: (url: string, options?: RequestInit) => Promise<Response>;
}

export interface AgentForgePlugin {
  manifest: PluginManifest;
  onInit?: (api: PluginApi) => Promise<void> | void;
  onDestroy?: () => Promise<void> | void;
  onTask?: (task: { id: string; prompt: string; agentId?: string }) => Promise<any>;
  onAgentMessage?: (message: { agentId: string; content: string; role: string }) => Promise<string | null>;
  onAutopilotTrigger?: (trigger: { autopilotId: string; type: string; payload: any }) => Promise<void>;
  routes?: { method: 'GET' | 'POST' | 'PATCH' | 'DELETE'; path: string; handler: (params: any, body?: any) => Promise<any> }[];
}
