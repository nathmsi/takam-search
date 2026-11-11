import { describe, expect, it } from 'vitest';
import { ApiError } from '../services/api-error';
import { shouldRetry } from './query-options';

describe('shouldRetry', () => {
  it('does not insist on a refusal (4xx)', () => {
    expect(shouldRetry(0, new ApiError(404, 'not found'))).toBe(false);
    expect(shouldRetry(0, new ApiError(400, 'bad request'))).toBe(false);
  });

  it('tries a failing or unreachable server two more times', () => {
    expect(shouldRetry(0, new ApiError(500, 'boom'))).toBe(true);
    expect(shouldRetry(1, new ApiError(0, 'unreachable'))).toBe(true);
    expect(shouldRetry(2, new ApiError(500, 'boom'))).toBe(false);
  });
});
