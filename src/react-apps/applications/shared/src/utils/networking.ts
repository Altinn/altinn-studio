import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

export async function get(url: string, options?: any): Promise<any> {
  try {
    const response: AxiosResponse = await axios.get(
      url,
      options ? options : null,
    );
    return response.data ? response.data : null;
  } catch (err) {
    throw err;
  }
}

export async function post(
  url: string,
  data?: string,
  options?: AxiosRequestConfig,
): Promise<void> {
  try {
    await axios.post(url, data ? data : null, options ? options : null);
  } catch (err) {
    throw err;
  }
}

export async function put(
  url: string,
  apiMode: string,
  data: any,
  config?: AxiosRequestConfig,
): Promise<void> {
  try {
    await axios.put(url + `/${apiMode}`, data, config ? config : null);
  } catch (err) {
    throw err;
  }
}

export function checkIfAxiosError(error: Error): boolean {
  return (error as AxiosError).config !== undefined;
}
