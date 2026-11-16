import { addXsrfToken, createHttpClient } from '@studio/http-client';
import type { RequestOptions, ResponseInterceptor } from '@studio/http-client';

export type { RequestOptions } from '@studio/http-client';
export { HttpError, isHttpError, isRequestCancelled } from '@studio/http-client';

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
