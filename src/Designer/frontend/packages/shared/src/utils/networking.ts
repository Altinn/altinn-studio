export type RequestOptions = {
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export type HttpResponse<T = any> = {
  status: number;
  data: T;
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

async function request<T>(
  method: string,
  url: string,
  data: unknown,
  options: RequestOptions = {},
): Promise<HttpResponse<T>> {
  const fetchResponse = await send(url, {
    method,
    headers: createHeaders(url, data, options.headers),
    body: toBody(data),
    signal: options.signal,
  });

  // The type parameter is the caller's claim about what the endpoint returns, as with `Response.json()`.
  const response: HttpResponse<T> = {
    status: fetchResponse.status,
    data: (await readData(fetchResponse)) as T,
  };
  if (!fetchResponse.ok) throw new HttpError<T>(response);

  redirectIfLoginPage(fetchResponse);
  return response;
}

async function send(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    if (isRequestCancelled(error)) throw error;
    throw new HttpError(undefined, (error as Error)?.message, { cause: error });
  }
}

function createHeaders(url: string, data: unknown, custom: Record<string, string> = {}): Headers {
  const headers = new Headers({ Accept: 'application/json, text/plain, */*' });
  if (isJson(data)) headers.set('Content-Type', 'application/json');
  Object.entries(custom).forEach(([name, value]) => headers.set(name, value));

  // The browser adds the multipart boundary only when Content-Type is not set.
  if (data instanceof FormData) headers.delete('Content-Type');

  const xsrfToken = isSameOrigin(url) ? readCookie(XSRF_COOKIE_NAME) : null;
  if (xsrfToken) headers.set(XSRF_HEADER_NAME, xsrfToken);

  return headers;
}

/**
 * Sends what fetch can send as it is, such as a string or FormData, and everything else as JSON. A
 * string is never serialized, so a caller that sends a JSON string serializes it first.
 */
function toBody(data: unknown): BodyInit | undefined {
  if (data === undefined || data === null) return undefined;
  return isBodyInit(data) ? data : JSON.stringify(data);
}

function isJson(data: unknown): boolean {
  return data !== undefined && data !== null && !isBodyInit(data);
}

function isBodyInit(data: unknown): data is BodyInit {
  return (
    typeof data === 'string' ||
    data instanceof FormData ||
    data instanceof URLSearchParams ||
    data instanceof Blob ||
    data instanceof ArrayBuffer ||
    ArrayBuffer.isView(data)
  );
}

/**
 * Parses the body as JSON when it is JSON, whatever the Content-Type says, since some endpoints
 * send JSON as text/plain. The rule config is one, through `Content(ruleConfig)` in
 * `AppDevelopmentController`. Any other body, including an empty one, is returned as text.
 */
async function readData(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Designer backend checks this header on requests that change data. See `MvcConfiguration.cs`. */
const XSRF_COOKIE_NAME = 'XSRF-TOKEN';
const XSRF_HEADER_NAME = 'X-XSRF-TOKEN';

function isSameOrigin(url: string): boolean {
  if (!URL.canParse(url, window.location.href)) return false;
  return new URL(url, window.location.href).origin === window.location.origin;
}

function readCookie(name: string): string | null {
  const cookie = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
}

/**
 * The browser follows redirects without telling us, so a request that Gitea redirected to its
 * login page arrives here as a successful response. Send the browser to '/login' instead, so Gitea
 * does not use its `redirect_to` cookie to send the user to the API path afterwards.
 */
function redirectIfLoginPage(response: Response): void {
  if (response.url.endsWith('/repos/user/login')) {
    window.location.href = '/login';
  }
}
