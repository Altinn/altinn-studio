import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpRequest } from './httpClient';
import { addXsrfToken } from './xsrfToken';

const origin = 'https://studio.example';

const sendTo = async (url: string): Promise<Headers> => {
  const request: HttpRequest = { method: 'POST', url, headers: new Headers() };
  await addXsrfToken(request);
  return request.headers;
};

describe('addXsrfToken', () => {
  beforeEach(() => {
    vi.stubGlobal('location', { href: `${origin}/app/page`, origin });
    vi.stubGlobal('document', { cookie: 'other=1; XSRF-TOKEN=token%2Fvalue' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the decoded cookie value on a request to a path', async () => {
    expect((await sendTo('/api/test')).get('X-XSRF-TOKEN')).toBe('token/value');
  });

  it('sends it on a full URL to the same origin', async () => {
    expect((await sendTo(`${origin}/api/test`)).get('X-XSRF-TOKEN')).toBe('token/value');
  });

  it('does not send it to another origin', async () => {
    expect((await sendTo('https://cdn.example/postal-codes.json')).has('X-XSRF-TOKEN')).toBe(false);
  });

  it('does not send it when there is no cookie', async () => {
    vi.stubGlobal('document', { cookie: 'other=1' });

    expect((await sendTo('/api/test')).has('X-XSRF-TOKEN')).toBe(false);
  });
});
