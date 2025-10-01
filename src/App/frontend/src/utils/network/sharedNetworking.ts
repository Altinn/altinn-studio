import axios from 'axios';
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HttpClientError<T = unknown, D = any> = AxiosError<T, D>;

export async function httpGet<T>(url: string, options?: AxiosRequestConfig): Promise<T> {
  const response: AxiosResponse = await axios.get(url, {
    headers: { Pragma: 'no-cache' },
    ...options,
  });
  return response.data;
}

export async function httpPut<T, D = unknown>(url: string, data: D, config?: AxiosRequestConfig) {
  return axios.put<T, AxiosResponse<T>, D>(url, data, config);
}
