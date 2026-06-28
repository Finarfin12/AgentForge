import { Injectable, Logger } from '@nestjs/common';
import {
  BaseProvider,
  ChatCompletionOptions,
  ChatCompletionResult,
  StreamChunk,
} from './base.provider';

@Injectable()
export class OpenaiCompatibleProvider extends BaseProvider {
  readonly name = 'openai-compatible';
  readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly logger = new Logger(OpenaiCompatibleProvider.name);

  constructor(baseUrl: string, apiKey: string) {
    super();
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.timeoutMs = parseInt(process.env.OPENAI_TIMEOUT || '60000', 10);
  }

  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        stream: false,
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI-compatible API error ${response.status}: ${err}`);
    }

    const data = (await response.json()) as any;
    return {
      content: data.choices[0].message.content,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!response.ok) return [];
      const data = (await response.json()) as any;
      return data.data?.map((m: any) => m.id) ?? [];
    } catch {
      return [];
    }
  }

  async *chatCompletionStream(
    options: ChatCompletionOptions,
  ): AsyncGenerator<StreamChunk> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        stream: true,
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI streaming error ${response.status}: ${err}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body from OpenAI stream');
    const decoder = new TextDecoder();
    let buffer = '';
    let finalUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            yield { token: '', done: true, usage: finalUsage };
            return;
          }
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta;
            if (delta?.content) {
              yield { token: delta.content, done: false };
            }
            if (json.usage) {
              finalUsage = {
                promptTokens: json.usage.prompt_tokens,
                completionTokens: json.usage.completion_tokens,
                totalTokens: json.usage.total_tokens,
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
      const models = await this.listModels();
      return models.length > 0;
    } catch {
      return false;
    }
  }
}
