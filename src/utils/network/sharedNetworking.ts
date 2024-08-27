import axios from 'axios';
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

export type HttpClientError = AxiosError;

export async function httpGet<T>(url: string, options?: AxiosRequestConfig): Promise<T> {
  const response: AxiosResponse = await axios.get(url, {
    headers: { Pragma: 'no-cache' },
    ...options,
  });
  return response.data ? response.data : null;
}

export async function httpPut<T, D = unknown>(url: string, data: D, config?: AxiosRequestConfig): Promise<T> {
  const response = await axios.put<T, AxiosResponse<T>, D>(url, data, config);
  return response.data;
}
