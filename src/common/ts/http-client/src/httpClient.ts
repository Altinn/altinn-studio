export type RequestOptions = {
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

/** A request on its way to `fetch`. A request interceptor may change it, such as adding a header. */
export type HttpRequest = {
  method: string;
  url: string;
  headers: Headers;
  body?: BodyInit;
  signal?: AbortSignal;
};

export type HttpResponse<T = unknown> = {
  status: number;
  data: T;
  headers: Headers;
};

/** The request that failed, with the values that were passed on to `fetch` after the request interceptors ran. */
export type FailedRequest = {
  method: string;
  url: string;
};

export type RequestInterceptor = (request: HttpRequest) => void | Promise<void>;

/** Runs on every response that arrives, before its body is read and whatever its status. */
export type ResponseInterceptor = (response: Response) => void | Promise<void>;

/** Runs on every HttpError before the client throws it, but not on an aborted request. */
export type ErrorInterceptor = (error: HttpError) => void | Promise<void>;

export type HttpClientConfig = {
  onRequest?: RequestInterceptor[];
  onResponse?: ResponseInterceptor[];
  onError?: ErrorInterceptor[];
};

export type HttpClient = {
  get<T = unknown>(url: string, options?: RequestOptions): Promise<HttpResponse<T>>;
  post<T = unknown>(
    url: string,
    data?: unknown,
    options?: RequestOptions,
  ): Promise<HttpResponse<T>>;
  put<T = unknown>(url: string, data?: unknown, options?: RequestOptions): Promise<HttpResponse<T>>;
  patch<T = unknown>(
    url: string,
    data?: unknown,
    options?: RequestOptions,
  ): Promise<HttpResponse<T>>;
  delete<T = unknown>(
    url: string,
    options?: RequestOptions & { data?: unknown },
  ): Promise<HttpResponse<T>>;
};

/**
 * Thrown when a request fails. A response with a status outside 2xx is on `response`. When the
 * request never got a response, such as on a network failure, `response` is undefined.
 */
export class HttpError<T = unknown> extends Error {
  readonly request: FailedRequest;
  readonly response?: HttpResponse<T>;

  constructor(
    request: FailedRequest,
    response?: HttpResponse<T>,
    { message, cause }: { message?: string; cause?: unknown } = {},
  ) {
    super(
      message ??
        (response ? `Request failed with status code ${response.status}` : 'Request failed'),
      { cause },
    );
    this.name = 'HttpError';
    this.request = request;
    this.response = response;
  }
}

export const isHttpError = <T = unknown>(error: unknown): error is HttpError<T> =>
  error instanceof HttpError;

/** Whether the request was aborted through its `signal`, such as when TanStack Query cancels it. */
export const isRequestCancelled = (error: unknown): boolean =>
  (error as { name?: unknown } | null)?.name === 'AbortError';

/**
 * Creates a client on top of `fetch`. The interceptors are set here, not registered on the client
 * later, so what a client does is visible where it is created.
 */
export function createHttpClient({
  onRequest = [],
  onResponse = [],
  onError = [],
}: HttpClientConfig = {}): HttpClient {
  async function request<T>(
    method: string,
    url: string,
    data: unknown,
    options: RequestOptions = {},
  ): Promise<HttpResponse<T>> {
    const httpRequest: HttpRequest = {
      method,
      url,
      headers: createHeaders(data, options.headers),
      body: toBody(data),
      signal: options.signal,
    };
    for (const intercept of onRequest) await intercept(httpRequest);

    try {
      return await send<T>(httpRequest);
    } catch (error) {
      if (error instanceof HttpError) {
        for (const intercept of onError) await intercept(error);
      }
      throw error;
    }
  }

  async function send<T>(httpRequest: HttpRequest): Promise<HttpResponse<T>> {
    const { url, ...init } = httpRequest;
    const failedRequest: FailedRequest = { method: httpRequest.method, url };
    const fetchResponse = await withHttpError(fetch(url, init), failedRequest);
    for (const intercept of onResponse) await intercept(fetchResponse);

    const data = await withHttpError(readData(fetchResponse), failedRequest, fetchResponse);
    // The type parameter is the caller's claim about what the endpoint returns, as with `Response.json()`.
    const response: HttpResponse<T> = {
      status: fetchResponse.status,
      data: data as T,
      headers: fetchResponse.headers,
    };
    if (!fetchResponse.ok) throw new HttpError<T>(failedRequest, response);
    return response;
  }

  return {
    get: (url, options) => request('GET', url, undefined, options),
    post: (url, data, options) => request('POST', url, data, options),
    put: (url, data, options) => request('PUT', url, data, options),
    patch: (url, data, options) => request('PATCH', url, data, options),
    delete: (url, options) => request('DELETE', url, options?.data, options),
  };
}

/**
 * Turns a failure to send the request, or to read the body after the status arrived, into an
 * HttpError. The status is kept when there is one, so a 403 still reads as a 403. An aborted
 * request is rethrown as it is.
 */
async function withHttpError<R>(
  promise: Promise<R>,
  request: FailedRequest,
  fetchResponse?: Response,
): Promise<R> {
  try {
    return await promise;
  } catch (error) {
    if (isRequestCancelled(error)) throw error;
    const response = fetchResponse && {
      status: fetchResponse.status,
      data: undefined,
      headers: fetchResponse.headers,
    };
    throw new HttpError(request, response, { message: (error as Error)?.message, cause: error });
  }
}

function createHeaders(data: unknown, custom: Record<string, string> = {}): Headers {
  const headers = new Headers({ Accept: 'application/json, text/plain, */*' });
  if (isJson(data)) headers.set('Content-Type', 'application/json');
  Object.entries(custom).forEach(([name, value]) => headers.set(name, value));

  // The browser adds the multipart boundary only when Content-Type is not set.
  if (data instanceof FormData) headers.delete('Content-Type');

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
 * send JSON as text/plain, such as the rule config from `AppDevelopmentController` in Designer. Any
 * other body, including an empty one, is returned as text.
 */
async function readData(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
