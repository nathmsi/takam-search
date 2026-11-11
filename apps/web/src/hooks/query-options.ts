import { ApiError } from '../services/api-error';

/** Do not insist on a refusal (4xx): the answer will be the same. A server that fails or is unreachable gets two more tries. */
export function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}
