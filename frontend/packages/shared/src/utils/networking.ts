import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';

export async function get<T = any>(url: string, options?: AxiosRequestConfig): Promise<T> {
  console.log({
    fire: 'fire',
    url,
  });
  const response: AxiosResponse = await axios
    .get<T>(url, options || undefined)
    .catch((err: AxiosError) => {
      consolel.log({ type: 'error', url, err });
    });
  console.log({
    url,
    response,
  });
  return response.data ? response.data : null;
}

export async function post<T = void, D = any>(
  url: string,
  data?: D,
  options?: AxiosRequestConfig,
): Promise<T> {
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

export function checkIfAxiosError(error: Error): boolean {
  return (error as AxiosError).config !== undefined;
}
