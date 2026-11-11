/** The address of a path of the API: `VITE_API_URL` in front, or nothing (the same origin: the dev and preview servers forward `/v1` to it). */
export function apiUrl(path: string): string {
  return `${import.meta.env.VITE_API_URL ?? ''}${path}`;
}
