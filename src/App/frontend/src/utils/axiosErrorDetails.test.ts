import type { AxiosError, AxiosResponse } from 'axios';

import { formatResponseBody, getAxiosErrorDetails } from 'src/utils/axiosErrorDetails';

describe('getAxiosErrorDetails', () => {
  it('should return null for errors that are not from axios', () => {
    expect(getAxiosErrorDetails(new Error('boom'))).toBeNull();
    expect(getAxiosErrorDetails(undefined)).toBeNull();
    expect(getAxiosErrorDetails('boom')).toBeNull();
  });

  it('should extract method, url, status and body from an axios error', () => {
    const error = new Error('Request failed with status code 500') as AxiosError;
    error.isAxiosError = true;
    error.config = {
      method: 'post',
      url: '/instances?instanceOwnerPartyId=501337&language=nb',
    } as AxiosError['config'];
    error.response = { status: 500, data: { title: 'Instance initialization failed.' } } as AxiosResponse;

    expect(getAxiosErrorDetails(error)).toEqual({
      method: 'POST',
      url: '/instances?instanceOwnerPartyId=501337&language=nb',
      responseStatus: 500,
      responseData: { title: 'Instance initialization failed.' },
    });
  });

  it('should handle a missing config and response', () => {
    const error = new Error('Network Error') as AxiosError;
    error.isAxiosError = true;

    expect(getAxiosErrorDetails(error)).toEqual({
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
