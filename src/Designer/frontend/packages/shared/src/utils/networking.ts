import { createHttpClient } from '@app/http-client';
import type { RequestInterceptor, RequestOptions, ResponseInterceptor } from '@app/http-client';

export type { HttpResponse, RequestOptions } from '@app/http-client';
export { HttpError, isHttpError, isRequestCancelled } from '@app/http-client';

/** Designer backend checks this header on requests that change data. See `MvcConfiguration.cs`. */
const XSRF_COOKIE_NAME = 'XSRF-TOKEN';
const XSRF_HEADER_NAME = 'X-XSRF-TOKEN';

const addXsrfToken: RequestInterceptor = ({ url, headers }) => {
  const token = isSameOrigin(url) ? readCookie(XSRF_COOKIE_NAME) : null;
  if (token) headers.set(XSRF_HEADER_NAME, token);
};

/**
 * The browser follows redirects without telling us, so a request that Gitea redirected to its
 * login page arrives as a successful response. Send the browser to '/login' instead, so Gitea does
 * not use its `redirect_to` cookie to send the user to the API path afterwards.
 */
const redirectIfLoginPage: ResponseInterceptor = (response) => {
  if (response.ok && response.url.endsWith('/repos/user/login')) {
    window.location.href = '/login';
  }
};

const designerClient = createHttpClient({
  onRequest: [addXsrfToken],
  onResponse: [redirectIfLoginPage],
});

// `get` and `post` give null for an empty body, as they did when they wrapped axios.
export async function get<T = any>(url: string, options?: RequestOptions): Promise<T | null> {
  const { data } = await designerClient.get<T>(url, options);
  return data ? data : null;
}

export async function post<T = void, D = any>(
  url: string,
  data?: D,
  options?: RequestOptions,
): Promise<T | null> {
  const response = await designerClient.post<T>(url, data || null, options);
  return response.data ? response.data : null;
}

export async function put<T = void, D = any>(
  url: string,
  data: D,
  options?: RequestOptions,
): Promise<T> {
  return (await designerClient.put<T>(url, data, options)).data;
}

export async function patch<T = void, D = any>(
  url: string,
  data: D,
  options?: RequestOptions,
): Promise<T> {
  return (await designerClient.patch<T>(url, data, options)).data;
}

/** Some Designer endpoints read a body on DELETE, so `data` is sent as the body when given. */
export async function del<T = void>(
  url: string,
  options?: RequestOptions & { data?: unknown },
): Promise<T> {
  return (await designerClient.delete<T>(url, options)).data;
}

function isSameOrigin(url: string): boolean {
  // `new URL` throws on a URL it cannot parse. `URL.canParse` would check without throwing, but
  // Safari before 17 lacks it, and the Vite build targets Safari 16.4.
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

function readCookie(name: string): string | null {
  const cookie = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
}
