import { HttpError } from '@studio/http-client';
import type { MockInstance } from 'vitest';

import { appClient, httpClient } from 'src/core/httpClient';
import { appPath } from 'src/utils/urls/appUrlHelper';

const sentHeaders = (fetchSpy: MockInstance<typeof fetch>): Headers => fetchSpy.mock.lastCall![1]!.headers as Headers;

describe('httpClient', () => {
  let fetchSpy: MockInstance<typeof fetch>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(null, { status: 204 }));
    document.cookie = 'XSRF-TOKEN=token; path=/';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('sends the XSRF header with a request to the app', async () => {
    await httpClient.put(`${appPath}/instances/1/process/next`, null);

    expect(sentHeaders(fetchSpy).get('X-XSRF-TOKEN')).toBe('token');
  });

  it('does not send the XSRF header to another host', async () => {
    await httpClient.get('https://cdn.example/postal-codes.json');

    expect(sentHeaders(fetchSpy).has('X-XSRF-TOKEN')).toBe(false);
  });
});

describe('appClient', () => {
  let fetchSpy: MockInstance<typeof fetch>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(null, { status: 204 }));
    document.cookie = 'XSRF-TOKEN=token; path=/';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('sends a path to the app, with the XSRF header', async () => {
    await appClient.post('/instances?instanceOwnerPartyId=1', {});

    expect(fetchSpy.mock.lastCall![0]).toBe('/ttd/test/instances?instanceOwnerPartyId=1');
    expect(sentHeaders(fetchSpy).get('X-XSRF-TOKEN')).toBe('token');
  });

  it('logs a request that fails', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('{}', { status: 500 }));
    const logError = vi.spyOn(window, 'logError').mockImplementation(() => {});

    await expect(appClient.get('/instances/1')).rejects.toThrow('Request failed with status code 500');

    expect(logError).toHaveBeenCalledWith('Request failed:\n', expect.any(HttpError));
  });
});
