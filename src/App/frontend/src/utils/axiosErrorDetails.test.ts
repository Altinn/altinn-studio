import type { AxiosError, AxiosResponse } from 'axios';

import { getAxiosErrorDetails } from 'src/utils/axiosErrorDetails';

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
