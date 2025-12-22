import { HttpResponseUtils } from './httpResponseUtils';
import type { AxiosError } from 'axios';

describe('HttpResponseUtils', () => {
  describe('isConflict', () => {
    it('should return true for 409 Conflict status', () => {
      const error = {
        response: {
          status: 409,
          statusText: 'Conflict',
          data: {},
          headers: {},
          config: {} as any,
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed with status code 409',
      } as AxiosError;

      expect(HttpResponseUtils.isConflict(error)).toBe(true);
    });

    it('should return false for 200 OK status', () => {
      const error = {
        response: {
          status: 200,
          statusText: 'OK',
          data: {},
          headers: {},
          config: {} as any,
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request succeeded',
      } as AxiosError;

      expect(HttpResponseUtils.isConflict(error)).toBe(false);
    });

    it('should return false for 404 Not Found status', () => {
      const error = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: {},
          headers: {},
          config: {} as any,
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed with status code 404',
      } as AxiosError;

      expect(HttpResponseUtils.isConflict(error)).toBe(false);
    });

    it('should return false for 500 Internal Server Error status', () => {
      const error = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: {},
          headers: {},
          config: {} as any,
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed with status code 500',
      } as AxiosError;

      expect(HttpResponseUtils.isConflict(error)).toBe(false);
    });

    it('should return false when response is undefined', () => {
      const error = {
        response: undefined,
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Network error',
      } as AxiosError;

      expect(HttpResponseUtils.isConflict(error)).toBe(false);
    });

    it('should return false when error is undefined', () => {
      expect(HttpResponseUtils.isConflict(undefined as any)).toBe(false);
    });

    it('should return false when error is null', () => {
      expect(HttpResponseUtils.isConflict(null as any)).toBe(false);
    });

    it('should handle partial error objects gracefully', () => {
      const error = {
        response: {
          status: undefined,
        },
      } as any;

      expect(HttpResponseUtils.isConflict(error)).toBe(false);
    });
  });
});
