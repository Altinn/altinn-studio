import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';

export async function get<T = any>(url: string, options?: AxiosRequestConfig): Promise<T | null> {
  const response: AxiosResponse = await axios.get<T>(url, options || undefined);
  return response.data ? response.data : null;
}

export async function post<T = void, D = any>(
  url: string,
  data?: D,
  options?: AxiosRequestConfig,
): Promise<T | null> {
  const response: AxiosResponse = await axios.post<T>(url, data || null, options || undefined);
  return response.data ? response.data : null;
}

export async function put<T = void, D = any>(
  url: string,
  data: D,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await axios.put<T>(url, data, config || undefined);
  return response.data;
}

export async function patch<T = void, D = any>(
  url: string,
  data: D,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await axios.patch<T>(url, data, config || undefined);
  return response.data;
}

export async function del<T = void>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await axios.delete<T>(url, config || undefined);
  return response.data;
}

/** The server's opaque ETag. Send it back unchanged. */
export type WithRevision = { revision?: string };

/** Adds the ETag response header as the document's revision. */
export async function getWithRevision<T extends object>(
  url: string,
  options?: AxiosRequestConfig,
): Promise<T & WithRevision> {
  const response = await axios.get<T>(url, options || undefined);
  return addRevision(response);
}

/** Transfers revisions through If-Match/ETag, omitting them from the document body. */
export async function putWithRevision<T extends object, D extends WithRevision = T>(
  url: string,
  { revision, ...data }: D,
  config?: AxiosRequestConfig,
): Promise<T & WithRevision> {
  const requestConfig = revision
    ? { ...config, headers: { ...config?.headers, 'If-Match': revision } }
    : config || undefined;
  const response = await axios.put<T>(url, data, requestConfig);
  return addRevision(response);
}

function addRevision<T extends object>(response: AxiosResponse<T>): T & WithRevision {
  const etag: unknown = response.headers?.etag;
  return typeof etag === 'string' ? { ...response.data, revision: etag } : response.data;
}

// we are unable to intercept redirect responses,
// so this workaround is needed to redirect the browser to the login page
axios.interceptors.response.use(function (response) {
  if (response.request.responseURL.match('/repos/user/login$')) {
    // redirect to '/login' to avoid gitea using the `redirect_to` cookie to the api call path
    window.location.href = '/login';
  }
  return response;
});
