import Axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

export async function get<ResponseType>(url: string, config?: AxiosRequestConfig): Promise<ResponseType> {
  const response: AxiosResponse = await Axios.get(url, config);
  return response.data as ResponseType;
}

export async function post<DataType, ResponseType>(
  url: string,
  data: DataType,
  config?: AxiosRequestConfig,
): Promise<ResponseType> {
  const response: AxiosResponse = await Axios.post(url, data, config);
  return response.data as ResponseType;
}
