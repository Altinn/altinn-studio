import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { del, get, patch, post, put } from './networking';

const testUrl = '/designer/api/test';

const lastHeaders = (fetchSpy: MockInstance<typeof fetch>): Headers =>
  fetchSpy.mock.lastCall[1].headers as Headers;

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

  describe('response data', () => {
    it('get and post return the parsed body', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse([{ value: '1' }]));
      fetchSpy.mockResolvedValueOnce(jsonResponse({ id: 1 }));

      expect(await get(testUrl)).toEqual([{ value: '1' }]);
      expect(await post(testUrl, { name: 'test' })).toEqual({ id: 1 });
    });

    it('get and post return null when the response has no body', async () => {
      fetchSpy.mockResolvedValueOnce(emptyResponse());
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      expect(await get(testUrl)).toBeNull();
      expect(await post(testUrl, { name: 'test' })).toBeNull();
    });

    it('put, patch and del return the parsed body', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ updated: true }));
      fetchSpy.mockResolvedValueOnce(jsonResponse({ updated: true }));
      fetchSpy.mockResolvedValueOnce(jsonResponse({ deleted: true }));

      expect(await put(testUrl, { name: 'test' })).toEqual({ updated: true });
      expect(await patch(testUrl, { name: 'test' })).toEqual({ updated: true });
      expect(await del(testUrl, { data: { members: ['123'] } })).toEqual({ deleted: true });
    });
  });

  describe('XSRF token', () => {
    it('is sent from the cookie on same-origin requests', async () => {
      document.cookie = 'XSRF-TOKEN=token%2Fvalue; path=/';
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      await post(testUrl, { name: 'test' });

      expect(lastHeaders(fetchSpy).get('X-XSRF-TOKEN')).toBe('token/value');
    });

    it('is not sent to other origins', async () => {
      document.cookie = 'XSRF-TOKEN=token; path=/';
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      await post('https://example.com/api', { name: 'test' });

      expect(lastHeaders(fetchSpy).has('X-XSRF-TOKEN')).toBe(false);
    });

    it('is not sent when there is no cookie', async () => {
      fetchSpy.mockResolvedValueOnce(emptyResponse());

      await post(testUrl, { name: 'test' });

      expect(lastHeaders(fetchSpy).has('X-XSRF-TOKEN')).toBe(false);
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
