import axios from 'axios';

import { getSearch, SearchParams } from 'src/features/routing/AppRoutingContext';
import { appPath } from 'src/utils/urls/appUrlHelper';

function getCookies(): { [key: string]: string } {
  const cookie = {};
  document.cookie.split(';').forEach((el) => {
    const split = el.split('=');
    cookie[split[0].trim()] = split.slice(1).join('=');
  });
  return cookie;
}

export function propagateTraceWhenPdf() {
  try {
    const isPdf = new URLSearchParams(getSearch('')).get(SearchParams.Pdf) === '1';

    if (isPdf) {
      const cookies = getCookies();
      axios.interceptors.request.use((config) => {
        try {
          if (config.url?.startsWith(appPath) !== true) {
            return config;
          }

          // This header is caught in app-lib/backend and used to allow injection of traceparent/context
          config.headers['X-Altinn-IsPdf'] = 'true';

          const traceparent = cookies['altinn-telemetry-traceparent'];
          const tracestate = cookies['altinn-telemetry-tracestate'];
          if (traceparent) {
            config.headers['traceparent'] = traceparent;
          }
          if (tracestate) {
            config.headers['tracestate'] = tracestate;
          }
          return config;
        } catch (err) {
          console.error('Error configuring propagation of W3C trace for request', err);
          return config;
        }
      });
    }
  } catch (err) {
    console.error('Error configuring propagation of W3C trace', err);
  }
}
