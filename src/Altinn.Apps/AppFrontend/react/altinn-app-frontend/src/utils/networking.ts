import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

export enum HttpStatusCodes {
  Forbidden = 403,
}

export interface IGetRequestResponse {
  body: any;
}

export async function get(url: string, options?: AxiosRequestConfig): Promise<any> {
  const response: AxiosResponse = await axios.get(
    url,
    {
      ...options,
      headers: { Pragma: 'no-cache', ...options?.headers },
    },
  );
  return response.data ? response.data : null;
}

export async function post(
  url: string,
  options?: AxiosRequestConfig,
  data?: any,
): Promise<AxiosResponse<any>> {
  const response: AxiosResponse = await axios.post(url, data, options || null);
  return response;
}

export async function put(
  url: string,
  apiMode: string,
  data: any,
  config?: AxiosRequestConfig,
): Promise<AxiosResponse<any>> {
  const response: AxiosResponse = await axios.put(`${url}/${apiMode}`, data, config || null);
  return response.data ? response.data : null;
}

export async function httpDelete(
  url: string,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<any>> {
  const response: AxiosResponse = await axios.delete(url, options || null);
  return response;
}

export async function putWithoutConfig<ReturnType>(
  url: string,
): Promise<AxiosResponse<ReturnType>> {
  try {
    const response = await axios.put(url);
    return response.data ? response.data : null;
  } catch (err) {
    throw new Error(`HTTP Call failed: ${err.message}`);
  }
}

export function checkIfAxiosError(error: Error): boolean {
  return (error as AxiosError).config !== undefined;
}
