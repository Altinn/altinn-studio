import { describe, expect, it } from 'vitest';
import { isGitNonFastForwardError } from './isGitNonFastForwardError';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';

describe('isGitNonFastForwardError', () => {
  it('should be true for an error with the GT_01 error code', () => {
    expect(isGitNonFastForwardError(createApiErrorMock(409, 'GT_01'))).toBe(true);
  });

  it('should be false for other errors', () => {
    expect(isGitNonFastForwardError(createApiErrorMock(500))).toBe(false);
    expect(isGitNonFastForwardError(new Error('Push failed'))).toBe(false);
  });
});
