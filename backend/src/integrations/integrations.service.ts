import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BaseProvider, ChatCompletionOptions, StreamChunk } from './providers/base.provider';
import { OpenaiCompatibleProvider } from './providers/openai-compatible.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { CliProvider } from './providers/cli.provider';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);
  private readonly registry = new Map<string, BaseProvider>();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults() {
    // Register CLI Provider
    const cli = new CliProvider();
    this.registry.set(cli.name, cli);
    // Register Ollama if available locally
    const ollama = new OllamaProvider(
      process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    );
    this.registry.set(ollama.name, ollama);

    // Register OpenAI-compatible if configured
    if (process.env.OPENAI_BASE_URL && process.env.OPENAI_API_KEY) {
      const openai = new OpenaiCompatibleProvider(
        process.env.OPENAI_BASE_URL,
        process.env.OPENAI_API_KEY,
      );
      this.registry.set(openai.name, openai);
    }
  }

  register(name: string, provider: BaseProvider) {
    this.registry.set(name, provider);
    this.logger.log(`Registered provider: ${name}`);
  }

  getProvider(name: string): BaseProvider {
    const provider = this.registry.get(name);
    if (!provider) {
      throw new NotFoundException(`Provider '${name}' not registered`);
    }
    return provider;
  }

  listProviders(): string[] {
    return Array.from(this.registry.keys());
  }

  async chatCompletion(providerName: string, options: ChatCompletionOptions) {
    const provider = this.getProvider(providerName);
    return provider.chatCompletion(options);
  }

  async *chatCompletionStream(providerName: string, options: ChatCompletionOptions): AsyncGenerator<StreamChunk> {
    const provider = this.getProvider(providerName);
    yield* provider.chatCompletionStream(options);
  }

  async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    for (const [name, provider] of this.registry.entries()) {
      results[name] = await provider.healthCheck().catch(() => false);
    }
    return results;
  }

  async listModels(providerName: string): Promise<string[]> {
    const provider = this.getProvider(providerName);
    return provider.listModels();
  }
}
