import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import {
  del,
  get,
  HttpError,
  isHttpError,
  isRequestCancelled,
  patch,
  post,
  put,
} from './networking';

const testUrl = '/designer/api/test';

type FetchCall = { url: string; init: RequestInit; headers: Headers };

const lastCall = (fetchSpy: MockInstance<typeof fetch>): FetchCall => {
  const [url, init] = fetchSpy.mock.lastCall;
  return { url: url as string, init, headers: init.headers as Headers };
};

const jsonResponse = (data: unknown, status: number = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const emptyResponse = (status: number = 204): Response => new Response(null, { status });

describe('networking', () => {
  let fetchSpy: MockInstance<typeof fetch>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  describe('get', () => {
    it('returns the parsed response body', async () => {
      const data = [{ value: '1' }, { value: '2' }];
      fetchSpy.mockResolvedValueOnce(jsonResponse(data));

      const result = await get(testUrl);

      expect(result).toEqual(data);
      const { url, init } = lastCall(fetchSpy);
      expect(url).toBe(testUrl);
      expect(init.method).toBe('GET');
      expect(init.body).toBeUndefined();
    });

    it('returns null when the response has no body', async () => {
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      expect(await get(testUrl)).toBeNull();
    });

    it('returns a body that is not JSON as text', async () => {
      fetchSpy.mockResolvedValueOnce(new Response('plain text', { status: 200 }));

      expect(await get(testUrl)).toBe('plain text');
    });

    it('parses JSON that the server sends as text/plain', async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response('{"data":[]}', { status: 200, headers: { 'Content-Type': 'text/plain' } }),
      );

      expect(await get(testUrl)).toEqual({ data: [] });
    });

    it('passes the signal on to fetch', async () => {
      const controller = new AbortController();
      fetchSpy.mockResolvedValueOnce(jsonResponse({}));

      await get(testUrl, { signal: controller.signal });

      expect(lastCall(fetchSpy).init.signal).toBe(controller.signal);
    });
  });

  describe('post', () => {
    it('sends an object as JSON and returns the response body', async () => {
      const data = { name: 'test' };
      fetchSpy.mockResolvedValueOnce(jsonResponse({ id: 1 }));

      const result = await post(testUrl, data);

      expect(result).toEqual({ id: 1 });
      const { init, headers } = lastCall(fetchSpy);
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify(data));
      expect(headers.get('Content-Type')).toBe('application/json');
    });

    it('returns null when the response has no body', async () => {
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      expect(await post(testUrl, { name: 'test' })).toBeNull();
    });

    it('sends no body when there is no data', async () => {
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      await post(testUrl);

      expect(lastCall(fetchSpy).init.body).toBeUndefined();
    });

    it('leaves out Content-Type on FormData, so the browser sets it with the boundary', async () => {
      const form = new FormData();
      form.append('file', new Blob(['content']), 'file.xsd');
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      await post(testUrl, form, { headers: { 'Content-Type': 'multipart/form-data' } });

      const { init, headers } = lastCall(fetchSpy);
      expect(init.body).toBe(form);
      expect(headers.has('Content-Type')).toBe(false);
    });

    it('sends a string as it is, without a Content-Type of its own', async () => {
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      await post(testUrl, 'raw text');

      const { init, headers } = lastCall(fetchSpy);
      expect(init.body).toBe('raw text');
      expect(headers.has('Content-Type')).toBe(false);
    });

    it('sends a string as it is when the caller sets the Content-Type to JSON', async () => {
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      await put(testUrl, JSON.stringify('newName'), {
        headers: { 'Content-Type': 'application/json' },
      });

      const { init, headers } = lastCall(fetchSpy);
      expect(init.body).toBe('"newName"');
      expect(headers.get('Content-Type')).toBe('application/json');
    });

    it('sends URLSearchParams as it is, so the browser sets the Content-Type', async () => {
      const params = new URLSearchParams({ name: 'test' });
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      await post(testUrl, params);

      const { init, headers } = lastCall(fetchSpy);
      expect(init.body).toBe(params);
      expect(headers.has('Content-Type')).toBe(false);
    });
  });

  describe('put, patch and del', () => {
    it('put sends the data and returns the response body', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ updated: true }));

      expect(await put(testUrl, { name: 'test' })).toEqual({ updated: true });
      expect(lastCall(fetchSpy).init.method).toBe('PUT');
    });

    it('patch sends the data and returns the response body', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ updated: true }));

      expect(await patch(testUrl, { name: 'test' })).toEqual({ updated: true });
      expect(lastCall(fetchSpy).init.method).toBe('PATCH');
    });

    it('del sends a DELETE request without a body', async () => {
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      await del(testUrl);

      const { init } = lastCall(fetchSpy);
      expect(init.method).toBe('DELETE');
      expect(init.body).toBeUndefined();
    });

    it('del sends data as the body when given', async () => {
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      await del(testUrl, { data: { members: ['123'] } });

      const { init, headers } = lastCall(fetchSpy);
      expect(init.method).toBe('DELETE');
      expect(init.body).toBe(JSON.stringify({ members: ['123'] }));
      expect(headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('headers', () => {
    it('accepts JSON and text', async () => {
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      await get(testUrl);

      expect(lastCall(fetchSpy).headers.get('Accept')).toBe('application/json, text/plain, */*');
    });

    it('sends the XSRF token from the cookie on same-origin requests', async () => {
      document.cookie = 'XSRF-TOKEN=token%2Fvalue; path=/';
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      await post(testUrl, { name: 'test' });

      expect(lastCall(fetchSpy).headers.get('X-XSRF-TOKEN')).toBe('token/value');
    });

    it('does not send the XSRF token to other origins', async () => {
      document.cookie = 'XSRF-TOKEN=token; path=/';
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      await post('https://example.com/api', { name: 'test' });

      expect(lastCall(fetchSpy).headers.has('X-XSRF-TOKEN')).toBe(false);
    });

    it('sends no XSRF header when there is no cookie', async () => {
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      await post(testUrl, { name: 'test' });

      expect(lastCall(fetchSpy).headers.has('X-XSRF-TOKEN')).toBe(false);
    });

    it('sends the headers the caller gives', async () => {
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      await get(testUrl, { headers: { 'X-Custom': 'value' } });

      expect(lastCall(fetchSpy).headers.get('X-Custom')).toBe('value');
    });
  });

  describe('errors', () => {
    it('throws an HttpError with the status and the parsed body when the status is not 2xx', async () => {
      const data = { errorCode: 'GT_01', detail: 'Something failed' };
      fetchSpy.mockResolvedValueOnce(jsonResponse(data, 409));

      const error = await get(testUrl).catch((e) => e);

      expect(isHttpError(error)).toBe(true);
      expect(error.response.status).toBe(409);
      expect(error.response.data).toEqual(data);
      expect(error.message).toBe('Request failed with status code 409');
    });

    it('throws an HttpError without a response when the request fails', async () => {
      fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const error = await post(testUrl, {}).catch((e) => e);

      expect(isHttpError(error)).toBe(true);
      expect(error.response).toBeUndefined();
      expect(error.message).toBe('Failed to fetch');
    });

    it('throws an HttpError with the status when the body cannot be read', async () => {
      const response = new Response(null, { status: 403 });
      vi.spyOn(response, 'text').mockRejectedValueOnce(new TypeError('network error'));
      fetchSpy.mockResolvedValueOnce(response);

      const error = await get(testUrl).catch((e) => e);

      expect(isHttpError(error)).toBe(true);
      expect(error.response.status).toBe(403);
      expect(error.message).toBe('network error');
    });

    it('rethrows an aborted request as it is', async () => {
      const abortError = new DOMException('The operation was aborted.', 'AbortError');
      fetchSpy.mockRejectedValueOnce(abortError);

      const error = await get(testUrl).catch((e) => e);

      expect(error).toBe(abortError);
      expect(isHttpError(error)).toBe(false);
      expect(isRequestCancelled(error)).toBe(true);
    });
  });

  describe('isHttpError', () => {
    it('returns false for other errors', () => {
      expect(isHttpError(new Error('error'))).toBe(false);
      expect(isHttpError({ response: { status: 500 } })).toBe(false);
    });

    it('returns true for an HttpError', () => {
      expect(isHttpError(new HttpError({ status: 500, data: null }))).toBe(true);
    });
  });

  describe('redirect to login', () => {
    const originalLocation = window.location;

    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...originalLocation, href: originalLocation.href },
      });
    });

    afterEach(() => {
      Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    });

    it('sends the browser to /login when Gitea redirected the request to its login page', async () => {
      const response = new Response('<html></html>', { status: 200 });
      Object.defineProperty(response, 'url', { value: 'http://localhost/repos/user/login' });
      fetchSpy.mockResolvedValueOnce(response);

      await get(testUrl);

      expect(window.location.href).toBe('/login');
    });
  });
});
