export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResult {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/** A single streamed token/chunk */
export interface StreamChunk {
  token: string;
  done: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export abstract class BaseProvider {
  abstract readonly name: string;
  abstract readonly baseUrl: string;

  abstract chatCompletion(
    options: ChatCompletionOptions,
  ): Promise<ChatCompletionResult>;

  /** Stream a chat completion. Default falls back to non-streaming. */
  async *chatCompletionStream(
    options: ChatCompletionOptions,
  ): AsyncGenerator<StreamChunk> {
    const result = await this.chatCompletion(options);
    yield { token: result.content, done: true, usage: result.usage };
  }

  abstract listModels(): Promise<string[]>;

  abstract healthCheck(): Promise<boolean>;
}
