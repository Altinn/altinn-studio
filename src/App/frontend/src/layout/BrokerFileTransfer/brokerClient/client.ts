import { apiUrl, redirectIfSessionEnded } from 'src/layout/BrokerFileTransfer/brokerClient/config';

export class ApiError extends Error {
  public readonly status: number;
  public readonly body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export type ApiFetchOptions = RequestInit & {
  redirectOnUnauthorized?: boolean;
};

export async function apiRequest(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { redirectOnUnauthorized = true, headers: initHeaders, ...rest } = options;
  const method = (rest.method ?? 'GET').toUpperCase();
  const headers = new Headers(initHeaders);

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !headers.has('X-Requested-With')) {
    headers.set('X-Requested-With', 'XMLHttpRequest');
  }

  const response = await fetch(apiUrl(path), {
    ...rest,
    method,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && redirectOnUnauthorized) {
    await redirectIfSessionEnded();
    throw new ApiError('Unauthorized', 401, await readBody(response));
  }

  return response;
}

export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  const response = await apiRequest(path, { ...options, headers });

  if (!response.ok) {
    throw new ApiError(`Request failed: ${response.status}`, response.status, await readBody(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('Content-Type') ?? '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

export async function readBody(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => '');
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
