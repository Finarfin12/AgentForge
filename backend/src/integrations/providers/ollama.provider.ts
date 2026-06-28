import { Injectable, Logger } from '@nestjs/common';
import {
  BaseProvider,
  ChatCompletionOptions,
  ChatCompletionResult,
  StreamChunk,
} from './base.provider';

@Injectable()
export class OllamaProvider extends BaseProvider {
  readonly name = 'ollama';
  readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly logger = new Logger(OllamaProvider.name);

  constructor(baseUrl = 'http://localhost:11434') {
    super();
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeoutMs = parseInt(process.env.OLLAMA_TIMEOUT || '30000', 10);
  }

  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      signal: controller.signal,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.maxTokens,
        },
      }),
    }).catch(err => {
      clearTimeout(timeout);
      if (err.name === 'AbortError') throw new Error(`Ollama request timed out (${this.timeoutMs}ms)`);
      throw err;
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Ollama API error ${response.status}: ${err}`);
    }

    const data = (await response.json()) as any;
    clearTimeout(timeout);
    return {
      content: data.message?.content ?? '',
      usage: data.eval_count
        ? {
            promptTokens: data.prompt_eval_count ?? 0,
            completionTokens: data.eval_count,
            totalTokens: (data.prompt_eval_count ?? 0) + data.eval_count,
          }
        : undefined,
    };
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) return [];
      const data = (await response.json()) as any;
      return data.models?.map((m: any) => m.name) ?? [];
    } catch {
      return [];
    }
  }

  async *chatCompletionStream(
    options: ChatCompletionOptions,
  ): AsyncGenerator<StreamChunk> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      signal: AbortSignal.timeout(this.timeoutMs),
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        stream: true,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Ollama streaming error ${response.status}: ${err}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body from Ollama stream');
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            const token = json.message?.content ?? '';
            if (token) {
              yield { token, done: false };
            }
            if (json.done) {
              yield {
                token: '',
                done: true,
                usage: json.eval_count
                  ? {
                      promptTokens: json.prompt_eval_count ?? 0,
                      completionTokens: json.eval_count,
                      totalTokens: (json.prompt_eval_count ?? 0) + json.eval_count,
                    }
                  : undefined,
              };
            }
          } catch {
            // skip malformed JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
