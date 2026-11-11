import type { ApiErrorDto } from '@takam/contracts';
import { ApiError } from './api-error';

/** Where the API is: `VITE_API_URL`, or the same origin (the dev and preview servers forward `/v1` to it). */
function apiBase(): string {
  return import.meta.env.VITE_API_URL ?? '';
}

/**
 * GET a JSON route of the API. It refuses anything that is not JSON (a proxy's page, a wrong address answered with a home
 * page) instead of failing later on `response.json()`, and turns every failure into an {@link ApiError}.
 */
export async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBase()}${path}`, { signal, headers: { Accept: 'application/json' } });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'The server cannot be reached');
  }
  if (!(response.headers.get('content-type') ?? '').includes('application/json')) {
    throw new ApiError(response.status, 'The server answered something that is not JSON');
  }
  const body: unknown = await response.json();
  if (!response.ok) {
    const error = body as ApiErrorDto;
    throw new ApiError(response.status, error.message ?? response.statusText, error);
  }
  return body as T;
}
