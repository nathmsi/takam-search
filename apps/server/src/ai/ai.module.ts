import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AI_PROVIDERS } from './ai.tokens';
import { GeminiProvider } from './providers/gemini.provider';

/** The AI side of the server: today the embeddings of the search by meaning, with Gemini. */
@Module({
  providers: [
    GeminiProvider,
    // Add new providers here. Order = default priority when several keys are set.
    { provide: AI_PROVIDERS, useFactory: (gemini: GeminiProvider) => [gemini], inject: [GeminiProvider] },
    AiService,
  ],
  exports: [AiService],
})
export class AiModule {}
