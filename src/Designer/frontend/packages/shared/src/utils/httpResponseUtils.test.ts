import { describe, expect, it } from 'vitest';
import { HttpResponseUtils } from './httpResponseUtils';
import { createHttpErrorMock } from 'app-shared/mocks/httpErrorMock';

describe('HttpResponseUtils', () => {
  describe('isConflict', () => {
    it('should return true for 409 Conflict status', () => {
      const error = createHttpErrorMock(409, {});

      expect(HttpResponseUtils.isConflict(error)).toBe(true);
    });

    it('should return false for 200 OK status', () => {
      const error = createHttpErrorMock(200, {});

      expect(HttpResponseUtils.isConflict(error)).toBe(false);
    });

    it('should return false for 404 Not Found status', () => {
      const error = createHttpErrorMock(404, {});

      expect(HttpResponseUtils.isConflict(error)).toBe(false);
    });

    it('should return false for 500 Internal Server Error status', () => {
      const error = createHttpErrorMock(500, {});

      expect(HttpResponseUtils.isConflict(error)).toBe(false);
    });

    it('should return false when response is undefined', () => {
      const error = createHttpErrorMock();

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
