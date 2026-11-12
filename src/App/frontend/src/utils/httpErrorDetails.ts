import { isHttpError } from '@studio/http-client';

export interface HttpErrorDetails {
  method: string | undefined;
  url: string | undefined;
  responseStatus: number | undefined;
  responseData: unknown;
}

/**
 * Extracts the request/response info for a failed request.
 * Returns null for errors that did not come from the http client.
 */
export function getHttpErrorDetails(error: unknown): HttpErrorDetails | null {
  if (!isHttpError(error)) {
    return null;
  }

  const { request, response } = error;
  return {
    method: request?.method,
    url: request?.url,
    responseStatus: response?.status,
    responseData: response?.data,
  };
}

/**
 * Formats a response body for display. The http client parses json responses, so the body is usually an object,
 * but it can also be a raw string (for instance an html error page from a gateway) or missing entirely.
 * Returns undefined when there is nothing (useful) to show.
 */
export function formatResponseBody(responseData: unknown): string | undefined {
  if (responseData == null) {
    return undefined;
  }

  if (typeof responseData === 'string') {
    return responseData.trim() || undefined;
  }

  try {
    return JSON.stringify(responseData, null, 2) ?? undefined;
  } catch {
    return undefined;
  }
}
