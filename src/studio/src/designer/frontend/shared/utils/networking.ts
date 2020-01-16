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
  data?: any,
  options?: AxiosRequestConfig,
): Promise<void> {
  try {
    const response: AxiosResponse = await axios.post(url, data ? data : null, options ? options : null);
    return response.data ? response.data : null;
  } catch (err) {
    throw err;
  }
}

export async function put(
  url: string,
  data: any,
  config?: AxiosRequestConfig,
): Promise<void> {
  try {
    const response = await axios.put(url, data, config ? config : null);
    return response.data;
  } catch (err) {
    throw err;
  }
}

export function checkIfAxiosError(error: Error): boolean {
  return (error as AxiosError).config !== undefined;
}
