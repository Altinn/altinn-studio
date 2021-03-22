import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

export async function get(url: string, options?: any): Promise<any> {
  const response: AxiosResponse = await axios.get(
    url,
    options || null,
  );
  return response.data ? response.data : null;
}

export async function post(
  url: string,
  data?: any,
  options?: AxiosRequestConfig,
): Promise<void> {
  const response: AxiosResponse = await axios.post(url, data || null, options || null);
  return response.data ? response.data : null;
}

export async function put(
  url: string,
  data: any,
  config?: AxiosRequestConfig,
): Promise<void> {
  const response = await axios.put(url, data, config || null);
  return response.data;
}

export async function del(
  url: string,
  config?: AxiosRequestConfig,
): Promise<void> {
  const response = await axios.delete(url, config || null);
  return response.data;
}

export function checkIfAxiosError(error: Error): boolean {
  return (error as AxiosError).config !== undefined;
}
