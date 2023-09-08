import { mergeQueryStatuses } from 'app-shared/utils/tanstackQueryUtils';

describe('tanstackQueryUtils', () => {
  describe('mergeQueryStatuses', () => {
    it('Returns "error" if at least one of the provided statuses is "error"', () => {
      expect(mergeQueryStatuses('error', 'loading', 'success')).toBe('error');
      expect(mergeQueryStatuses('loading', 'error', 'success')).toBe('error');
      expect(mergeQueryStatuses('loading', 'success', 'error')).toBe('error');
    });

    it('Returns "loading" if none of the provided statuses is "error" and at least one of them is "loading"', () => {
      expect(mergeQueryStatuses('loading', 'success', 'success')).toBe('loading');
      expect(mergeQueryStatuses('success', 'loading', 'success')).toBe('loading');
      expect(mergeQueryStatuses('success', 'success', 'loading')).toBe('loading');
    });

    it('Returns "success" if all of the provided statuses are "success"', () => {
      expect(mergeQueryStatuses('success', 'success', 'success')).toBe('success');
      expect(mergeQueryStatuses('success', 'success')).toBe('success');
      expect(mergeQueryStatuses('success')).toBe('success');
      expect(mergeQueryStatuses()).toBe('success');
    });
  });
});
