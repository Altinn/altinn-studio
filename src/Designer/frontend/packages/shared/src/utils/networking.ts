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

// Configure axios to send credentials and tokens for appropriate requests
axios.interceptors.request.use((config) => {
  const url = config.url;
  if (url) {
    // Send credentials for same-origin requests
    const isSameOrigin = url.startsWith('/') || url.startsWith(window.location.origin);
    config.withCredentials = isSameOrigin;

    // Add Gitea access token for Gitea API requests
    // TODO: Replace with proper authentication mechanism
    const isGiteaApi = url.includes('/repos/api/v1/') || url.includes('/repos/repo/');
    if (isGiteaApi) {
      if (!config.headers) {
        // @ts-ignore - Temporary solution for Gitea authentication
        config.headers = {};
      }
      // @ts-ignore - Temporary solution for Gitea authentication
      config.headers.Authorization = `token fb6bf022c946599f94279a9d335539bcf82b2b75`;
    }
  }
  return config;
});

// we are unable to intercept redirect responses,
// so this workaround is needed to redirect the browser to the login page
axios.interceptors.response.use(function (response) {
  if (response.request.responseURL.match('/repos/user/login$')) {
    // redirect to '/login' to avoid gitea using the `redirect_to` cookie to the api call path
    window.location.href = '/login';
  }
  return response;
});
