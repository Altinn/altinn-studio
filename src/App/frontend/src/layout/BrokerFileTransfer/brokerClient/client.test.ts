import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiFetch, apiRequest } from 'src/layout/BrokerFileTransfer/brokerClient/client';
import { configureBrokerClient } from 'src/layout/BrokerFileTransfer/brokerClient/config';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  configureBrokerClient({ baseUrl: 'https://platform.example/', redirectIfSessionEnded: async () => false });
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

function sentRequest() {
  const [url, init] = fetchMock.mock.calls[0];
  return { url, init: init!, headers: new Headers(init!.headers) };
}

describe('apiRequest', () => {
  it('sends to the configured base url with the cookie', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await apiRequest('/broker/api/v1/filetransfer');

    const { url, init } = sentRequest();
    expect(url).toBe('https://platform.example/broker/api/v1/filetransfer');
    expect(init.credentials).toBe('include');
  });

  it('marks mutations for the CSRF check, but not reads', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await apiRequest('/x', { method: 'post' });
    await apiRequest('/x');

    expect(new Headers(fetchMock.mock.calls[0][1]!.headers).get('X-Requested-With')).toBe('XMLHttpRequest');
    expect(new Headers(fetchMock.mock.calls[1][1]!.headers).has('X-Requested-With')).toBe(false);
  });

  it('asks whether the session ended before failing on a 401', async () => {
    const redirectIfSessionEnded = vi.fn(async () => true);
    configureBrokerClient({ redirectIfSessionEnded });
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    await expect(apiRequest('/x')).rejects.toMatchObject({ name: 'ApiError', status: 401 });
    expect(redirectIfSessionEnded).toHaveBeenCalledOnce();
  });

  it("keeps Broker's problem details when failing on a 401", async () => {
    fetchMock.mockResolvedValue(Response.json({ errorCode: 6 }, { status: 401 }));

    await expect(apiRequest('/x')).rejects.toMatchObject({ status: 401, body: { errorCode: 6 } });
  });

  it('hands a 401 back as is when asked not to redirect', async () => {
    const redirectIfSessionEnded = vi.fn(async () => true);
    configureBrokerClient({ redirectIfSessionEnded });
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    const response = await apiRequest('/x', { redirectOnUnauthorized: false });

    expect(response.status).toBe(401);
    expect(redirectIfSessionEnded).not.toHaveBeenCalled();
  });
});

describe('apiFetch', () => {
  it('answers with the parsed JSON body', async () => {
    fetchMock.mockResolvedValue(Response.json({ fileTransferId: 'abc' }));

    await expect(apiFetch('/x')).resolves.toEqual({ fileTransferId: 'abc' });
    expect(sentRequest().headers.get('Accept')).toBe('application/json');
  });

  it('throws the problem details of a failed request', async () => {
    fetchMock.mockResolvedValue(Response.json({ detail: 'No access' }, { status: 403 }));

    const error = await apiFetch('/x').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 403, body: { detail: 'No access' } });
  });
});
