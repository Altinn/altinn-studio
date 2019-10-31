import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

export enum HttpStatusCodes {
  Forbidden = 403,
}

export interface IGetRequestResponse {
  body: any;
}

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
  options?: AxiosRequestConfig,
  data?: any,
): Promise<AxiosResponse<any>> {
  try {
    const response: AxiosResponse = await axios.post(url, data, options ? options : null);
    return response;
  } catch (err) {
    throw err;
  }
}

export async function put(
  url: string,
  apiMode: string,
  data: any,
  config?: AxiosRequestConfig,
): Promise<AxiosResponse<any>> {
  try {
    const response: AxiosResponse = await axios.put(`${url}/${apiMode}`, data, config ? config : null);
    return response.data ? response.data : null;
  } catch (err) {
    throw err;
  }
}

export async function putWithoutConfig<ReturnType>(
  url: string,
): Promise<AxiosResponse<ReturnType>> {
  try {
    const response = await axios.put(url);
    return response.data ? response.data : null;
  } catch (err) {
    throw new Error('HTTP Call failed: ' + err.message);
  }
}

export function checkIfAxiosError(error: Error): boolean {
  return (error as AxiosError).config !== undefined;
}
