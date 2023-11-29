import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse, RawAxiosRequestHeaders } from 'axios';

export enum HttpStatusCodes {
  Ok = 200,
  BadRequest = 400,
  Forbidden = 403,
}

export async function httpGet(url: string, options?: AxiosRequestConfig): Promise<any> {
  const headers = options?.headers as RawAxiosRequestHeaders | undefined;
  const response: AxiosResponse = await axios.get(url, {
    ...options,
    headers: { ...headers, Pragma: 'no-cache' },
  });
  return response.data ? response.data : null;
}

export async function httpGetRaw(url: string, options?: AxiosRequestConfig): Promise<any> {
  const headers = options?.headers as RawAxiosRequestHeaders | undefined;
  const response: AxiosResponse = await axios.get(url, {
    ...options,
    headers: { ...headers, Pragma: 'no-cache' },
  });
  return response.data ? response : null;
}

export async function httpPost(url: string, options?: AxiosRequestConfig, data?: any): Promise<AxiosResponse> {
  return await axios.post(url, data, options);
}

export async function httpDelete(url: string, options?: AxiosRequestConfig): Promise<AxiosResponse> {
  return await axios.delete(url, options);
}

export async function putWithoutConfig<ReturnType>(url: string): Promise<ReturnType> {
  try {
    const response = await axios.put(url);
    return response.data ? response.data : null;
  } catch (err) {
    throw new Error(`HTTP Call failed: ${err.message}`);
  }
}
