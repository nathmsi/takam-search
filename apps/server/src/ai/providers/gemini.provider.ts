import { Injectable } from '@nestjs/common';
import { EMBEDDING_DIMENSIONS } from '../embedding-dimensions';
import type { AiProvider, EmbedRequest, EmbeddingTask } from './ai-provider.interface';

const MODEL = 'gemini-embedding-001';
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:batchEmbedContents`;
const TIMEOUT_MS = 30_000;
/** Gemini answers 503 ("high demand") or 429 for a few seconds now and then: wait and ask again. */
const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [400, 1200, 2500];
const TASK_TYPES: Record<EmbeddingTask, string> = { document: 'RETRIEVAL_DOCUMENT', query: 'RETRIEVAL_QUERY' };

interface BatchAnswer {
  readonly embeddings?: ReadonlyArray<{ readonly values?: number[] }>;
}

/** Google Gemini over REST, no SDK (the key is `GEMINI_API_KEY`, sent in a header and never in the address). */
@Injectable()
export class GeminiProvider implements AiProvider {
  readonly name = 'gemini';
  readonly embeddingModel = MODEL;

  isConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY);
  }

  /** At most 100 texts per call (Gemini's limit). Fails if the answer is not one vector of the right size per text. */
  async embed({ texts, task }: EmbedRequest): Promise<number[][]> {
    const response: Response = await this.post({
      requests: texts.map((text: string) => ({
        model: `models/${MODEL}`,
        content: { parts: [{ text }] },
        taskType: TASK_TYPES[task],
        outputDimensionality: EMBEDDING_DIMENSIONS,
      })),
    });
    const vectors: number[][] = ((await response.json()) as BatchAnswer).embeddings?.map((item) => item.values ?? []) ?? [];
    if (vectors.length !== texts.length || vectors.some((vector) => vector.length !== EMBEDDING_DIMENSIONS)) {
      throw new Error(`Gemini did not give ${texts.length} vectors of ${EMBEDDING_DIMENSIONS} numbers`);
    }
    return vectors;
  }

  private async post(body: object): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      const response: Response = await fetch(URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY as string },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.ok) return response;
      if (!RETRY_STATUS.has(response.status) || attempt >= RETRY_DELAYS_MS.length) {
        throw new Error(`Gemini answered ${response.status}: ${(await response.text()).slice(0, 300)}`);
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
}
