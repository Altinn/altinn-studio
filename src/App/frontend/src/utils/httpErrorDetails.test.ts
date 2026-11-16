import { HttpError } from '@studio/http-client';

import { formatResponseBody, getHttpErrorDetails } from 'src/utils/httpErrorDetails';

describe('getHttpErrorDetails', () => {
  it('should return null for errors that are not from the http client', () => {
    expect(getHttpErrorDetails(new Error('boom'))).toBeNull();
    expect(getHttpErrorDetails(undefined)).toBeNull();
    expect(getHttpErrorDetails('boom')).toBeNull();
  });

  it('should extract method, url, status and body from an http error', () => {
    const error = new HttpError({ status: 500, data: { title: 'Instance initialization failed.' } }, undefined, {
      request: { method: 'POST', url: '/instances?instanceOwnerPartyId=501337&language=nb' },
    });

    expect(getHttpErrorDetails(error)).toEqual({
      method: 'POST',
      url: '/instances?instanceOwnerPartyId=501337&language=nb',
      responseStatus: 500,
      responseData: { title: 'Instance initialization failed.' },
    });
  });

  it('should handle a missing request and response', () => {
    const error = new HttpError(undefined, 'Failed to fetch');

    expect(getHttpErrorDetails(error)).toEqual({
      method: undefined,
      url: undefined,
      responseStatus: undefined,
      responseData: undefined,
    });
  });
});

describe('formatResponseBody', () => {
  it('should format responseBody property', () => {
    expect(formatResponseBody({ title: 'Boom' })).toBe('{\n  "title": "Boom"\n}');
  });

  it('should return text bodies as-is, without json escaping', () => {
    expect(formatResponseBody('<html>\n<body>502 Bad Gateway</body>\n</html>')).toBe(
      '<html>\n<body>502 Bad Gateway</body>\n</html>',
    );
  });

  it('should return undefined when there is nothing to show', () => {
    expect(formatResponseBody(undefined)).toBeUndefined();
    expect(formatResponseBody(null)).toBeUndefined();
    expect(formatResponseBody('')).toBeUndefined();
  });
});
