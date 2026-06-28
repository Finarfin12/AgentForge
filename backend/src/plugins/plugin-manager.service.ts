import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { readdirSync, statSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { AgentForgePlugin, PluginApi } from './plugin.interface';

export interface PluginState {
  name: string;
  version: string;
  description: string;
  author?: string;
  enabled: boolean;
  hooks: string[];
  loaded: boolean;
  error?: string;
}

@Injectable()
export class PluginManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PluginManagerService.name);
  private pluginsDir = resolve(process.cwd(), 'plugins');
  private plugins = new Map<string, { instance: AgentForgePlugin; state: PluginState }>();
  private pluginApi: PluginApi;

  constructor() {
    this.pluginApi = {
      logger: {
        info: (msg) => this.logger.log(`[Plugin] ${msg}`),
        warn: (msg) => this.logger.warn(`[Plugin] ${msg}`),
        error: (msg) => this.logger.error(`[Plugin] ${msg}`),
      },
      db: null,
      http: (url, opts) => fetch(url, opts),
    };
  }

  onModuleInit() {
    this.loadAll();
  }

  onModuleDestroy() {
    this.unloadAll();
  }

  getPlugins(): PluginState[] {
    return Array.from(this.plugins.values()).map((p) => p.state);
  }

  getPlugin(name: string): PluginState | null {
    return this.plugins.get(name)?.state ?? null;
  }

  async reload(name: string): Promise<PluginState> {
    const existing = this.plugins.get(name);
    if (existing && existing.state.enabled) {
      try {
        await existing.instance.onDestroy?.();
      } catch {}
    }
    this.plugins.delete(name);
    return this.loadPlugin(name);
  }

  async setEnabled(name: string, enabled: boolean): Promise<PluginState> {
    const p = this.plugins.get(name);
    if (!p) throw new Error(`Plugin "${name}" not found`);
    p.state.enabled = enabled;
    if (enabled && !p.state.loaded) {
      try {
        await p.instance.onInit?.(this.pluginApi);
        p.state.loaded = true;
        p.state.error = undefined;
      } catch (err) {
        p.state.error = (err as Error).message;
      }
    }
    return p.state;
  }

  private loadAll() {
    if (!existsSync(this.pluginsDir)) {
      this.logger.warn(`Plugins directory not found: ${this.pluginsDir}`);
      return;
    }
    const entries = readdirSync(this.pluginsDir);
    for (const entry of entries) {
      const fullPath = join(this.pluginsDir, entry);
      if (statSync(fullPath).isDirectory()) {
        this.loadPlugin(entry);
      }
    }
  }

  private loadPlugin(name: string): PluginState {
    try {
      const pluginPath = join(this.pluginsDir, name);
      if (!existsSync(pluginPath) || !statSync(pluginPath).isDirectory()) {
        throw new Error(`Plugin directory not found: ${name}`);
      }
      const indexJs = join(pluginPath, 'index.js');
      if (!existsSync(indexJs)) {
        throw new Error(`No index.js found in plugin: ${name}`);
      }

      delete require.cache[require.resolve(indexJs)];
      const instance: AgentForgePlugin = require(indexJs);

      if (!instance.manifest) {
        throw new Error(`Plugin "${name}" missing manifest`);
      }

      const state: PluginState = {
        name: instance.manifest.name,
        version: instance.manifest.version,
        description: instance.manifest.description,
        author: instance.manifest.author,
        enabled: true,
        hooks: instance.manifest.hooks || [],
        loaded: false,
      };

      this.plugins.set(name, { instance, state });

      // Auto-init enabled plugins
      if (state.enabled && instance.onInit) {
        instance.onInit(this.pluginApi);
        state.loaded = true;
      }

      this.logger.log(`Plugin loaded: ${state.name} v${state.version}`);
      return state;
    } catch (err) {
      this.logger.warn(`Failed to load plugin "${name}": ${(err as Error).message}`);
      const state: PluginState = {
        name, version: '?', description: '', enabled: false, hooks: [], loaded: false, error: (err as Error).message,
      };
      this.plugins.set(name, { instance: null as any, state });
      return state;
    }
  }

  private unloadAll() {
    for (const [name, p] of this.plugins) {
      if (p.state.enabled && p.instance.onDestroy) {
        try { p.instance.onDestroy(); } catch (err) { this.logger.warn(`Plugin "${name}" destroy error: ${(err as Error).message}`); }
      }
    }
    this.plugins.clear();
  }
}
