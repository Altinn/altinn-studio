import type { HttpResponse, RequestOptions } from '@studio/http-client';

import { httpClient } from 'src/core/httpClient';

export enum HttpStatusCodes {
  Ok = 200,
  BadRequest = 400,
  Forbidden = 403,
  Gone = 410,
}

export async function httpGet<T>(url: string, options?: RequestOptions) {
  const response = await httpClient.get<T>(url, {
    ...options,
    headers: { ...options?.headers, Pragma: 'no-cache' },
  });
  return response.data ?? null;
}

export async function httpGetRaw<ResponseData = unknown>(
  url: string,
  options?: RequestOptions,
): Promise<HttpResponse<ResponseData> | null> {
  const response = await httpClient.get<ResponseData>(url, {
    ...options,
    headers: { ...options?.headers, Pragma: 'no-cache' },
  });
  return response.data ? response : null;
}

export async function httpPost<T, D = unknown>(
  url: string,
  options?: RequestOptions,
  data?: D,
): Promise<HttpResponse<T>> {
  return httpClient.post<T>(url, data, options);
}

export async function httpPatch<T, D = unknown>(
  url: string,
  data: D,
  options?: RequestOptions,
): Promise<HttpResponse<T>> {
  return httpClient.patch<T>(url, data, options);
}

export async function httpDelete(url: string, options?: RequestOptions): Promise<HttpResponse> {
  return httpClient.delete(url, options);
}

export async function putWithoutConfig<ReturnType>(url: string): Promise<ReturnType> {
  const response = await httpClient.put<ReturnType>(url);
  return response.data;
}
