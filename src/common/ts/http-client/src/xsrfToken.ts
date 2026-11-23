import type { RequestInterceptor } from './httpClient';

const XSRF_COOKIE_NAME = 'XSRF-TOKEN';
const XSRF_HEADER_NAME = 'X-XSRF-TOKEN';

/**
 * Sends the token from the `XSRF-TOKEN` cookie in the `X-XSRF-TOKEN` header, as axios did. The
 * Designer and app backends check that header on requests that change data. A request to another
 * origin never gets the token.
 */
export const addXsrfToken: RequestInterceptor = ({ url, headers }) => {
  const token = isSameOrigin(url) ? readCookie(XSRF_COOKIE_NAME) : null;
  if (token) headers.set(XSRF_HEADER_NAME, token);
};

function isSameOrigin(url: string): boolean {
  // `new URL` throws on a URL it cannot parse. `URL.canParse` would check without throwing, but
  // Safari before 17 lacks it, and the frontends target Safari 16.4.
  try {
    return new URL(url, location.href).origin === location.origin;
  } catch {
    return false;
  }
}

function readCookie(name: string): string | null {
  const cookie = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
}
