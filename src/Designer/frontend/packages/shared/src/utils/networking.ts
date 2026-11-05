export type RequestOptions = {
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export type HttpResponse<T = any> = {
  status: number;
  data: T;
  headers?: Headers;
};

/**
 * Thrown when a request fails. A response with a status outside 2xx is on `response`. When the
 * request never got a response, such as on a network failure, `response` is undefined.
 */
export class HttpError<T = any> extends Error {
  readonly response?: HttpResponse<T>;

  constructor(response?: HttpResponse<T>, message?: string, options?: { cause?: unknown }) {
    super(
      message ??
        (response ? `Request failed with status code ${response.status}` : 'Request failed'),
      options,
    );
    this.name = 'HttpError';
    this.response = response;
  }
}

export const isHttpError = <T = any>(error: unknown): error is HttpError<T> =>
  error instanceof HttpError;

/** Whether the request was aborted through its `signal`, such as when TanStack Query cancels it. */
export const isRequestCancelled = (error: unknown): boolean =>
  (error as { name?: unknown } | null)?.name === 'AbortError';

export async function get<T = any>(url: string, options?: RequestOptions): Promise<T | null> {
  const response = await request<T>('GET', url, undefined, options);
  return response.data ? response.data : null;
}

export async function post<T = void, D = any>(
  url: string,
  data?: D,
  options?: RequestOptions,
): Promise<T | null> {
  const response = await request<T>('POST', url, data || null, options);
  return response.data ? response.data : null;
}

export async function put<T = void, D = any>(
  url: string,
  data: D,
  options?: RequestOptions,
): Promise<T> {
  return (await request<T>('PUT', url, data, options)).data;
}

export async function patch<T = void, D = any>(
  url: string,
  data: D,
  options?: RequestOptions,
): Promise<T> {
  return (await request<T>('PATCH', url, data, options)).data;
}

/** Some Designer endpoints read a body on DELETE, so `data` is sent as the body when given. */
export async function del<T = void>(
  url: string,
  options?: RequestOptions & { data?: unknown },
): Promise<T> {
  return (await request<T>('DELETE', url, options?.data, options)).data;
}

const XSRF_COOKIE_NAME = 'XSRF-TOKEN';
const XSRF_HEADER_NAME = 'X-XSRF-TOKEN';

async function request<T>(
  method: string,
  url: string,
  data: unknown,
  options: RequestOptions = {},
): Promise<HttpResponse<T>> {
  const headers = new Headers({ Accept: 'application/json, text/plain, */*' });
  Object.entries(options.headers ?? {}).forEach(([name, value]) => headers.set(name, value));

  const body = serializeBody(data, headers);
  addXsrfToken(url, headers);

  let fetchResponse: Response;
  try {
    fetchResponse = await fetch(url, { method, headers, body, signal: options.signal });
  } catch (error) {
    if (isRequestCancelled(error)) throw error;
    throw new HttpError<T>(undefined, (error as Error)?.message, { cause: error });
  }

  const response: HttpResponse<T> = {
    status: fetchResponse.status,
    data: await parseBody<T>(fetchResponse),
    headers: fetchResponse.headers,
  };

  if (!fetchResponse.ok) {
    throw new HttpError<T>(response);
  }

  redirectIfLoginPage(fetchResponse);
  return response;
}

/**
 * Serializes the body the way the API expects: objects as JSON, and strings as they are unless the
 * caller asks for JSON. FormData keeps no Content-Type, so the browser sets it with the boundary.
 */
function serializeBody(data: unknown, headers: Headers): BodyInit | undefined {
  if (data === undefined || data === null) return undefined;

  if (data instanceof FormData) {
    headers.delete('Content-Type');
    return data;
  }

  if (
    data instanceof Blob ||
    data instanceof ArrayBuffer ||
    ArrayBuffer.isView(data) ||
    data instanceof URLSearchParams
  ) {
    return data as BodyInit;
  }

  const hasJsonContentType = headers.get('Content-Type')?.includes('application/json') ?? false;
  if (typeof data === 'object' || hasJsonContentType) {
    headers.set('Content-Type', headers.get('Content-Type') ?? 'application/json');
    return stringifyJson(data);
  }

  return String(data);
}

/** A string that already is JSON is sent as it is, so a caller can pass pre-serialized JSON. */
function stringifyJson(data: unknown): string {
  if (typeof data === 'string') {
    try {
      JSON.parse(data);
      return data.trim();
    } catch {
      return JSON.stringify(data);
    }
  }
  return JSON.stringify(data);
}

async function parseBody<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return text as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

/** Designer backend checks this header on requests that change data. See `MvcConfiguration.cs`. */
function addXsrfToken(url: string, headers: Headers): void {
  if (!isSameOrigin(url)) return;
  const token = readCookie(XSRF_COOKIE_NAME);
  if (token) headers.set(XSRF_HEADER_NAME, token);
}

function isSameOrigin(url: string): boolean {
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * The browser follows redirects without telling us, so a request that Gitea redirected to its
 * login page arrives here as a successful response. Send the browser to '/login' instead, so Gitea
 * does not use its `redirect_to` cookie to send the user to the API path afterwards.
 */
function redirectIfLoginPage(response: Response): void {
  if (response.url.match('/repos/user/login$')) {
    window.location.href = '/login';
  }
}
