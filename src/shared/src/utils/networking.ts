import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';

export async function get(url: string, options?: AxiosRequestConfig): Promise<any> {
  const response: AxiosResponse = await axios.get(url, {
    headers: { Pragma: 'no-cache' },
    ...options,
  });
  return response.data ? response.data : null;
}

export async function post(url: string, data?: any, options?: AxiosRequestConfig): Promise<void> {
  const response: AxiosResponse = await axios.post(url, data || null, options);
  return response.data ? response.data : null;
}

export async function put(url: string, data: any, config?: AxiosRequestConfig): Promise<void> {
  const response = await axios.put(url, data, config);
  return response.data;
}

export function isAxiosError(error: any): error is AxiosError {
  return error && (error as AxiosError).config !== undefined;
}
