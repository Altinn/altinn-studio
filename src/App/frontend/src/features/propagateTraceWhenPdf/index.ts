import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

import { axiosInstance } from 'src/core/axiosInstance';
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

export function propagateTraceWhenPdf() {
  try {
    const isPdf = new URLSearchParams(window.location.search).get(SearchParams.Pdf) === '1';

    if (isPdf) {
      const cookies = getCookies();
      const addTraceHeaders = (config: InternalAxiosRequestConfig) => {
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
      };

      // Global axios uses full URLs — only add headers for requests to our app
      axios.interceptors.request.use((config) => {
        try {
          if (config.url?.startsWith(appPath) !== true) {
            return config;
          }
          return addTraceHeaders(config);
        } catch (err) {
          console.error('Error configuring propagation of W3C trace for request', err);
          return config;
        }
      });

      // axiosInstance already has baseURL scoped to the app, so all its requests are app requests
      axiosInstance.interceptors.request.use((config) => {
        try {
          return addTraceHeaders(config);
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
