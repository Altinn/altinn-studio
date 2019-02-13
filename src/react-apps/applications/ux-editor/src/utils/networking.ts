import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

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
): Promise<void> {
  try {
    await axios.post(url, options ? options : null);
  } catch (err) {
    throw err;
  }
}

export async function put(
  url: string,
  apiMode: string,
  data: any,
  config?: AxiosRequestConfig,
  validationTriggerField?: string,
): Promise<any> {
  try {
    let putUrl = `${url}/${apiMode}`;
    if (validationTriggerField) {
      putUrl += `?validationTriggerField=${validationTriggerField}`;
    }
    const response: AxiosResponse = await axios.put(putUrl, data, config ? config : null);
    return response.data ? response.data : null;
  } catch (err) {
    throw err;
  }
}

export function checkIfAxiosError(error: Error): boolean {
  return (error as AxiosError).config !== undefined;
}
