import { mergeQueryStatuses } from 'app-shared/utils/tanstackQueryUtils';

describe('tanstackQueryUtils', () => {
  describe('mergeQueryStatuses', () => {
    it('Returns "error" if at least one of the provided statuses is "error"', () => {
      expect(mergeQueryStatuses('error', 'pending', 'success')).toBe('error');
      expect(mergeQueryStatuses('pending', 'error', 'success')).toBe('error');
      expect(mergeQueryStatuses('pending', 'success', 'error')).toBe('error');
    });

    it('Returns "pending" if none of the provided statuses is "error" and at least one of them is "pending"', () => {
      expect(mergeQueryStatuses('pending', 'success', 'success')).toBe('pending');
      expect(mergeQueryStatuses('success', 'pending', 'success')).toBe('pending');
      expect(mergeQueryStatuses('success', 'success', 'pending')).toBe('pending');
    });

    it('Returns "success" if all of the provided statuses are "success"', () => {
      expect(mergeQueryStatuses('success', 'success', 'success')).toBe('success');
      expect(mergeQueryStatuses('success', 'success')).toBe('success');
      expect(mergeQueryStatuses('success')).toBe('success');
      expect(mergeQueryStatuses()).toBe('success');
    });
  });
});
