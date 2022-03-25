import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';


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
  options?: any,
): Promise<any> {
  try {
    const response: AxiosResponse = await axios.post(url, options ? options : null);
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
): Promise<any> {
  try {
    const response: AxiosResponse = await axios.put(`${url}/${apiMode}`, data, config ? config : null);
    return response.data ? response.data : null;
  } catch (err) {
    throw err;
  }
}

export async function deleteCall(url: string): Promise<any> {
  const response: AxiosResponse = await axios.delete(url);
  return response?.data;
}

