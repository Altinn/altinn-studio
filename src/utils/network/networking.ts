import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse, RawAxiosRequestHeaders } from 'axios';

export enum HttpStatusCodes {
  Ok = 200,
  BadRequest = 400,
  Forbidden = 403,
}

export async function httpGet<T, D = unknown>(url: string, options?: AxiosRequestConfig<D>) {
  const headers = options?.headers as RawAxiosRequestHeaders | undefined;
  const response = await axios.get<T, AxiosResponse<T>, D>(url, {
    ...options,
    headers: { ...headers, Pragma: 'no-cache' },
  });
  return response.data ?? null;
}

export async function httpGetRaw<ResponseData = unknown>(
  url: string,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<ResponseData> | null> {
  const headers = options?.headers as RawAxiosRequestHeaders | undefined;
  const response: AxiosResponse = await axios.get(url, {
    ...options,
    headers: { ...headers, Pragma: 'no-cache' },
  });
  return response.data ? response : null;
}

export async function httpPost<T, D = unknown>(
  url: string,
  options?: AxiosRequestConfig,
  data?: D,
): Promise<AxiosResponse> {
  return await axios.post<T, AxiosResponse<T>, D>(url, data, options);
}

export async function httpPatch<T, D = unknown>(url: string, data: D, options?: AxiosRequestConfig) {
  const response = await axios.patch<T, AxiosResponse<T>, D>(url, data, options);
  return response.data;
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
