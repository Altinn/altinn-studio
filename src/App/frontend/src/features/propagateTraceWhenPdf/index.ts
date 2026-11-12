import type { RequestInterceptor } from '@studio/http-client';

import { SearchParams } from 'src/core/routing/types';
import { appPath } from 'src/utils/urls/appUrlHelper';

function getCookies(): { [key: string]: string } {
  const cookie = {};
  document.cookie.split(';').forEach((el) => {
    const split = el.split('=');
    cookie[split[0].trim()] = split.slice(1).join('=');
  });
  return cookie;
}

let traceHeaders: Record<string, string> | null = null;

export function propagateTraceWhenPdf() {
  try {
    const isPdf = new URLSearchParams(window.location.search).get(SearchParams.Pdf) === '1';
    if (!isPdf) {
      return;
    }

    const cookies = getCookies();
    const headers: Record<string, string> = { 'X-Altinn-IsPdf': 'true' };
    const traceparent = cookies['altinn-telemetry-traceparent'];
    const tracestate = cookies['altinn-telemetry-tracestate'];
    if (traceparent) {
      headers['traceparent'] = traceparent;
    }
    if (tracestate) {
      headers['tracestate'] = tracestate;
    }
    traceHeaders = headers;
  } catch (err) {
    console.error('Error configuring propagation of W3C trace', err);
  }
}

/** Adds the trace headers to every request, for a client that only sends requests to the app. */
export const addPdfTraceHeaders: RequestInterceptor = ({ headers }) => {
  try {
    Object.entries(traceHeaders ?? {}).forEach(([name, value]) => headers.set(name, value));
  } catch (err) {
    console.error('Error configuring propagation of W3C trace for request', err);
  }
};

/** Adds the trace headers only to requests to the app, for a client that also sends requests to other hosts. */
export const addPdfTraceHeadersToAppUrls: RequestInterceptor = (request) => {
  if (request.url.startsWith(appPath)) {
    addPdfTraceHeaders(request);
  }
};
