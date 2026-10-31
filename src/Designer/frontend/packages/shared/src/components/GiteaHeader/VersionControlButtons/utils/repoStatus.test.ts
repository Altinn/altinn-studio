import { describe, expect, it } from 'vitest';
import { isCheckoutConflict, isMergeConflict, toMergeConflictRepoStatus } from './repoStatus';
import { mockRepoStatus } from '../test/mocks/versionControlContextMock';

describe('repoStatus', () => {
  describe('isMergeConflict', () => {
    it('should be true when the status says there are conflicts', () => {
      expect(isMergeConflict({ ...mockRepoStatus, repositoryStatus: 'MergeConflict' })).toBe(true);
      expect(isMergeConflict({ ...mockRepoStatus, hasMergeConflict: true })).toBe(true);
    });

    it('should be false for a checkout conflict, which uncommitted changes cause', () => {
      expect(isMergeConflict({ ...mockRepoStatus, repositoryStatus: 'CheckoutConflict' })).toBe(
        false,
      );
    });
  });

  describe('isCheckoutConflict', () => {
    it('should be true only for a checkout conflict', () => {
      expect(isCheckoutConflict({ ...mockRepoStatus, repositoryStatus: 'CheckoutConflict' })).toBe(
        true,
      );
      expect(isCheckoutConflict({ ...mockRepoStatus, repositoryStatus: 'MergeConflict' })).toBe(
        false,
      );
    });
  });

  describe('toMergeConflictRepoStatus', () => {
    it('should keep the status and mark it as a merge conflict', () => {
      const status = { ...mockRepoStatus, aheadBy: 1, repositoryStatus: 'Ok' };

      expect(toMergeConflictRepoStatus(status)).toEqual({
        ...status,
        hasMergeConflict: true,
        repositoryStatus: 'MergeConflict',
      });
    });
  });
});
