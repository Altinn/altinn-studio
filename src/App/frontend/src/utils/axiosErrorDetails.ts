import type { AxiosError } from 'axios';

import { isAxiosError } from 'src/utils/isAxiosError';

export interface AxiosErrorDetails {
  method: string | undefined;
  url: string | undefined;
  responseStatus: number | undefined;
  responseData: unknown;
}

/**
 * Extracts the request/response info for a failed request.
 * Returns null for errors that did not come from axios.
 */
export function getAxiosErrorDetails(error: unknown): AxiosErrorDetails | null {
  if (!isAxiosError(error)) {
    return null;
  }

  const { config, response } = error as AxiosError;
  return {
    method: config?.method?.toUpperCase(),
    url: config?.url,
    responseStatus: response?.status,
    responseData: response?.data,
  };
}
