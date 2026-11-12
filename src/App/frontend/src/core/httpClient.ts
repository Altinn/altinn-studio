import { createHttpClient } from '@studio/http-client';
import type { ErrorInterceptor, RequestInterceptor } from '@studio/http-client';

import { addPdfTraceHeaders, addPdfTraceHeadersToAppUrls } from 'src/features/propagateTraceWhenPdf';
import { GlobalData } from 'src/GlobalData';

/** Sends a full URL as it is, whether it goes to the app or to another host, such as the CDN. */
export const httpClient = createHttpClient({ onRequest: [addPdfTraceHeadersToAppUrls] });

const prefixAppPath: RequestInterceptor = (request) => {
  request.url = `${GlobalData.basename}/${request.url.replace(/^\/+/, '')}`;
};

const logFailedRequest: ErrorInterceptor = (error) => {
  window.logError('Request failed:\n', error);
};

/** Sends a path in the app, such as `/instances`, to the app, and logs every request that fails. */
export const appClient = createHttpClient({
  onRequest: [prefixAppPath, addPdfTraceHeaders],
  onError: [logFailedRequest],
});
