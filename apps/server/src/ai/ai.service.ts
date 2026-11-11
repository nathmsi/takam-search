import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { AI_PROVIDERS } from './ai.tokens';
import type { AiProvider } from './providers/ai-provider.interface';

/**
 * The one entry point for AI calls. It owns the choice of provider and the mapping of failures to HTTP errors; the
 * providers only know how to talk to their own API.
 * Choice: `AI_PROVIDER=<name>` if set and configured, else the first configured provider of the `AI_PROVIDERS` list.
 */
@Injectable()
export class AiService {
  private readonly logger: Logger = new Logger(AiService.name);

  constructor(@Inject(AI_PROVIDERS) private readonly providers: AiProvider[]) {}

  /** The provider in use, or `null` when no API key is set. */
  active(): AiProvider | null {
    const forced: string | undefined = process.env.AI_PROVIDER;
    const picked: AiProvider | undefined = forced ? this.providers.find((provider) => provider.name === forced && provider.isConfigured()) : undefined;
    return picked ?? this.providers.find((provider) => provider.isConfigured()) ?? null;
  }

  /** The embedding of the words of a question. 503 (the search by words keeps working) without a key, or when the provider fails. */
  async embedQuestion(question: string): Promise<number[]> {
    const provider: AiProvider | null = this.active();
    if (provider === null) throw new ServiceUnavailableException('The search by meaning is not set up on this server (no AI key)');
    try {
      const [embedding] = await provider.embed({ texts: [question], task: 'query' });
      return embedding;
    } catch (error) {
      this.logger.error(`${provider.name} failed: ${error instanceof Error ? error.message : error}`);
      throw new ServiceUnavailableException('The search by meaning is not available right now');
    }
  }
}
