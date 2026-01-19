import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';

export async function get<T = any>(url: string, options?: AxiosRequestConfig): Promise<T> {
  const response: AxiosResponse = await axios.get<T>(url, options || undefined);
  return response.data ? response.data : null;
}

export async function post<T = void, D = any>(
  url: string,
  data?: D,
  options?: AxiosRequestConfig,
): Promise<T> {
  const response: AxiosResponse = await axios.post<T>(url, data || null, options || undefined);
  return response.data ? response.data : null;
}

export async function put<T = void, D = any>(
  url: string,
  data: D,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await axios.put<T>(url, data, config || undefined);
  return response.data;
}

export async function patch<T = void, D = any>(
  url: string,
  data: D,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await axios.patch<T>(url, data, config || undefined);
  return response.data;
}

export async function del<T = void>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await axios.delete<T>(url, config || undefined);
  return response.data;
}

// we are unable to intercept redirect responses,
// so this workaround is needed to redirect the browser to the login page
axios.interceptors.response.use(function (response) {
  if (response.request.responseURL.match('/repos/user/login$')) {
    // redirect to '/login' to avoid gitea using the `redirect_to` cookie to the api call path
    window.location.href = '/login';
  }
  return response;
});
