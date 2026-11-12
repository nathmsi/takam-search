/** What the text is for: a document that will be searched, or a question that searches. Providers make better vectors when told. */
export type EmbeddingTask = 'document' | 'query';

export interface EmbedRequest {
  readonly texts: readonly string[];
  readonly task: EmbeddingTask;
}

/**
 * One AI backend. To add another (OpenAI, Voyage...): implement this, add the class to `AI_PROVIDERS` in `ai.module.ts`,
 * and select it with `AI_PROVIDER=<name>`. Text generation (the RAG answer) will be one more method here.
 */
export interface AiProvider {
  readonly name: string;
  /** The model that makes the embeddings. */
  readonly embeddingModel: string;
  /** True when the provider's API key is set. */
  isConfigured(): boolean;
  /** One vector of `EMBEDDING_DIMENSIONS` numbers per text. Throws on failure; `AiService` maps it to an HTTP error. */
  embed(request: EmbedRequest): Promise<number[][]>;
}
