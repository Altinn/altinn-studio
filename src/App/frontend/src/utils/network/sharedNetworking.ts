import type { HttpError, HttpResponse, RequestOptions } from '@studio/http-client';

import { httpClient } from 'src/core/httpClient';

export type HttpClientError<T = unknown> = HttpError<T>;

export async function httpGet<T>(url: string, options?: RequestOptions): Promise<T> {
  const response = await httpClient.get<T>(url, {
    headers: { Pragma: 'no-cache' },
    ...options,
  });
  return response.data;
}

export async function httpPut<T, D = unknown>(
  url: string,
  data: D,
  options?: RequestOptions,
): Promise<HttpResponse<T>> {
  return httpClient.put<T>(url, data, options);
}
