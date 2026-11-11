import { ServiceUnavailableException } from '@nestjs/common';
import { AiService } from './ai.service';
import type { AiProvider } from './providers/ai-provider.interface';

const provider = (name: string, configured: boolean, embed: AiProvider['embed'] = jest.fn()): AiProvider => ({ name, embeddingModel: `${name}-model`, isConfigured: () => configured, embed });

describe('AiService', () => {
  const forced = process.env.AI_PROVIDER;

  afterEach(() => {
    if (forced === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = forced;
  });

  it('takes the first provider that has a key', () => {
    expect(new AiService([provider('a', false), provider('b', true), provider('c', true)]).active()?.name).toBe('b');
  });

  it('takes the provider named by AI_PROVIDER when it is configured', () => {
    process.env.AI_PROVIDER = 'c';

    expect(new AiService([provider('b', true), provider('c', true)]).active()?.name).toBe('c');
  });

  it('says 503, without calling anything, when no provider has a key', async () => {
    const embed = jest.fn();

    await expect(new AiService([provider('a', false, embed)]).embedQuestion('שאלה')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(embed).not.toHaveBeenCalled();
  });

  it('asks for a query embedding and gives the vector', async () => {
    const embed = jest.fn().mockResolvedValue([[0.1, 0.2]]);

    expect(await new AiService([provider('a', true, embed)]).embedQuestion('שאלה')).toEqual([0.1, 0.2]);
    expect(embed).toHaveBeenCalledWith({ texts: ['שאלה'], task: 'query' });
  });

  it('says 503, and does not show the provider message, when the provider fails', async () => {
    const embed = jest.fn().mockRejectedValue(new Error('quota exceeded'));

    await expect(new AiService([provider('a', true, embed)]).embedQuestion('שאלה')).rejects.toThrow('not available right now');
  });
});
