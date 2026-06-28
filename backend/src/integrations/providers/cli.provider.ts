import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  BaseProvider,
  ChatCompletionOptions,
  ChatCompletionResult,
} from './base.provider';

const execAsync = promisify(exec);

@Injectable()
export class CliProvider extends BaseProvider {
  readonly name = 'cli';
  readonly baseUrl = 'local-cli';
  private readonly logger = new Logger(CliProvider.name);

  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    const prompt = options.messages.map(m => {
      if (m.role === 'system') return `[System Instruction]: ${m.content}`;
      if (m.role === 'user') return `User: ${m.content}`;
      if (m.role === 'assistant') return `Assistant: ${m.content}`;
      return m.content;
    }).join('\n\n');

    const fullPrompt = `${prompt}\n\nAssistant:`;

    let cliBin = options.model && options.model !== 'default' ? options.model : 'hermes';

    const TIMEOUT_MS = 120000;

    try {
      const escaped = fullPrompt.replace(/"/g, '\\"');
      const cmd = `"${cliBin}" -z "${escaped}"`;

      const result = await Promise.race([
        execAsync(cmd, { timeout: TIMEOUT_MS, shell: true as any, maxBuffer: 10 * 1024 * 1024 }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('CLI execution timed out after 120s')), TIMEOUT_MS)
        ),
      ]);

      const { stdout, stderr } = result as { stdout: string; stderr: string };

      if (stderr && !stdout) {
        this.logger.warn(`CLI returned stderr: ${stderr}`);
      }

      return {
        content: stdout.trim() || `No response from ${cliBin} CLI.`,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    } catch (err) {
      this.logger.error(`Failed to execute CLI ${cliBin}: ${(err as Error).message}`);
      throw new Error(`CLI execution failed: ${(err as Error).message}`);
    }
  }

  async listModels(): Promise<string[]> {
    return ['hermes', 'opencode', 'commandcode', 'freebuff', 'claude', 'codex'];
  }

  async healthCheck(): Promise<boolean> {
    try {
      await execAsync('hermes --version', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
