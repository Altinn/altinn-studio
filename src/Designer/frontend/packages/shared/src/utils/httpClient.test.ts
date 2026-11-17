import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { createHttpClient, HttpError, isHttpError, isRequestCancelled } from './httpClient';

const testUrl = '/api/test';

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

describe('createHttpClient', () => {
  let fetchSpy: MockInstance<typeof fetch>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('requests', () => {
    it('returns the status and the parsed body', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ id: 1 }, 201));

      const response = await createHttpClient().post(testUrl, { name: 'test' });

      expect(response).toEqual({ status: 201, data: { id: 1 } });
    });

    it.each([
      ['get', 'GET'],
      ['post', 'POST'],
      ['put', 'PUT'],
      ['patch', 'PATCH'],
      ['delete', 'DELETE'],
    ] as const)('%s sends a %s request', async (method, expected) => {
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      await createHttpClient()[method](testUrl);

      const { url, init } = lastCall(fetchSpy);
      expect(url).toBe(testUrl);
      expect(init.method).toBe(expected);
    });

    it('passes the signal on to fetch', async () => {
      const controller = new AbortController();
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      await createHttpClient().get(testUrl, { signal: controller.signal });

      expect(lastCall(fetchSpy).init.signal).toBe(controller.signal);
    });

    it('sends data as the body of a DELETE request when given', async () => {
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      await createHttpClient().delete(testUrl, { data: { members: ['123'] } });

      expect(lastCall(fetchSpy).init.body).toBe(JSON.stringify({ members: ['123'] }));
    });
  });

  describe('bodies', () => {
    it('sends an object as JSON', async () => {
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      await createHttpClient().post(testUrl, { name: 'test' });

      const { init, headers } = lastCall(fetchSpy);
      expect(init.body).toBe(JSON.stringify({ name: 'test' }));
      expect(headers.get('Content-Type')).toBe('application/json');
    });

    it('sends no body when there is no data', async () => {
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      await createHttpClient().post(testUrl);

      expect(lastCall(fetchSpy).init.body).toBeUndefined();
    });

    it('leaves out Content-Type on FormData, so the browser sets it with the boundary', async () => {
      const form = new FormData();
      form.append('file', new Blob(['content']), 'file.xsd');
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      await createHttpClient().post(testUrl, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { init, headers } = lastCall(fetchSpy);
      expect(init.body).toBe(form);
      expect(headers.has('Content-Type')).toBe(false);
    });

    it('sends a string as it is, without a Content-Type of its own', async () => {
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      await createHttpClient().post(testUrl, 'raw text');

      const { init, headers } = lastCall(fetchSpy);
      expect(init.body).toBe('raw text');
      expect(headers.has('Content-Type')).toBe(false);
    });

    it('sends a string as it is when the caller sets the Content-Type to JSON', async () => {
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      await createHttpClient().put(testUrl, JSON.stringify('newName'), {
        headers: { 'Content-Type': 'application/json' },
      });

      const { init, headers } = lastCall(fetchSpy);
      expect(init.body).toBe('"newName"');
      expect(headers.get('Content-Type')).toBe('application/json');
    });

    it('sends URLSearchParams as it is, so the browser sets the Content-Type', async () => {
      const params = new URLSearchParams({ name: 'test' });
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      await createHttpClient().post(testUrl, params);

      const { init, headers } = lastCall(fetchSpy);
      expect(init.body).toBe(params);
      expect(headers.has('Content-Type')).toBe(false);
    });
  });

  describe('responses', () => {
    it('returns a body that is not JSON as text', async () => {
      fetchSpy.mockResolvedValueOnce(new Response('plain text', { status: 200 }));

      expect((await createHttpClient().get(testUrl)).data).toBe('plain text');
    });

    it('parses JSON that the server sends as text/plain', async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response('{"data":[]}', { status: 200, headers: { 'Content-Type': 'text/plain' } }),
      );

      expect((await createHttpClient().get(testUrl)).data).toEqual({ data: [] });
    });

    it('returns an empty body as an empty string', async () => {
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      expect((await createHttpClient().get(testUrl)).data).toBe('');
    });
  });

  describe('headers', () => {
    it('accepts JSON and text', async () => {
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      await createHttpClient().get(testUrl);

      expect(lastCall(fetchSpy).headers.get('Accept')).toBe('application/json, text/plain, */*');
    });

    it('sends the headers the caller gives', async () => {
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      await createHttpClient().get(testUrl, { headers: { 'X-Custom': 'value' } });

      expect(lastCall(fetchSpy).headers.get('X-Custom')).toBe('value');
    });
  });

  describe('interceptors', () => {
    it('runs the request interceptors in order before fetch, and sends what they changed', async () => {
      fetchSpy.mockResolvedValueOnce(emptyResponse());
      const client = createHttpClient({
        onRequest: [
          ({ headers }) => headers.set('X-Order', 'first'),
          ({ headers }) => headers.set('X-Order', `${headers.get('X-Order')},second`),
        ],
      });

      await client.get(testUrl);

      expect(lastCall(fetchSpy).headers.get('X-Order')).toBe('first,second');
    });

    it('waits for an async request interceptor', async () => {
      fetchSpy.mockResolvedValueOnce(emptyResponse());
      const client = createHttpClient({
        onRequest: [async ({ headers }) => headers.set('Authorization', 'Bearer token')],
      });

      await client.get(testUrl);

      expect(lastCall(fetchSpy).headers.get('Authorization')).toBe('Bearer token');
    });

    it('gives the response interceptors every response, also one with an error status', async () => {
      const seen: number[] = [];
      fetchSpy.mockResolvedValueOnce(emptyResponse(200));
      fetchSpy.mockResolvedValueOnce(jsonResponse({}, 500));
      const client = createHttpClient({
        onResponse: [(response) => void seen.push(response.status)],
      });

      await client.get(testUrl);
      await client.get(testUrl).catch(() => {});

      expect(seen).toEqual([200, 500]);
    });

    it('does not share interceptors between clients', async () => {
      fetchSpy.mockResolvedValue(emptyResponse());
      createHttpClient({ onRequest: [({ headers }) => headers.set('X-Client', 'a')] });

      await createHttpClient().get(testUrl);

      expect(lastCall(fetchSpy).headers.has('X-Client')).toBe(false);
    });
  });

  describe('errors', () => {
    it('throws an HttpError with the status and the parsed body when the status is not 2xx', async () => {
      const data = { errorCode: 'GT_01', detail: 'Something failed' };
      fetchSpy.mockResolvedValueOnce(jsonResponse(data, 409));

      const error = await createHttpClient()
        .get(testUrl)
        .catch((e) => e);

      expect(isHttpError(error)).toBe(true);
      expect(error.response).toEqual({ status: 409, data });
      expect(error.message).toBe('Request failed with status code 409');
    });

    it('throws an HttpError without a response when the request fails', async () => {
      fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const error = await createHttpClient()
        .post(testUrl, {})
        .catch((e) => e);

      expect(isHttpError(error)).toBe(true);
      expect(error.response).toBeUndefined();
      expect(error.message).toBe('Failed to fetch');
    });

    it('throws an HttpError with the status when the body cannot be read', async () => {
      const response = new Response(null, { status: 403 });
      vi.spyOn(response, 'text').mockRejectedValueOnce(new TypeError('network error'));
      fetchSpy.mockResolvedValueOnce(response);

      const error = await createHttpClient()
        .get(testUrl)
        .catch((e) => e);

      expect(isHttpError(error)).toBe(true);
      expect(error.response.status).toBe(403);
      expect(error.message).toBe('network error');
    });

    it('rethrows an aborted request as it is', async () => {
      const abortError = new DOMException('The operation was aborted.', 'AbortError');
      fetchSpy.mockRejectedValueOnce(abortError);

      const error = await createHttpClient()
        .get(testUrl)
        .catch((e) => e);

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
});
