import type { ApiErrorDto } from '@takam/contracts';

/** What the API answered when it was not a success. `status` 0 means the server could not be reached at all. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorDto | undefined;

  constructor(status: number, message: string, body?: ApiErrorDto) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}
