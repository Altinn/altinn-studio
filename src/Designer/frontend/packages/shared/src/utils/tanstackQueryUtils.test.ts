import type { Query } from '@tanstack/react-query';
import { isAppSpecificQuery, mergeQueryStatuses } from 'app-shared/utils/tanstackQueryUtils';

const createQueryWithKey = (queryKey: unknown[]): Query => ({ queryKey }) as unknown as Query;

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

  describe('isAppSpecificQuery', () => {
    const org = 'testOrg';
    const app = 'testApp';

    it('should return true when org and app match key positions 1 and 2', () => {
      const query = createQueryWithKey(['SomeQueryKey', org, app]);
      expect(isAppSpecificQuery(query, org, app)).toBe(true);
    });

    it('should return true when key has additional segments after org and app', () => {
      const query = createQueryWithKey(['SomeQueryKey', org, app, 'extra']);
      expect(isAppSpecificQuery(query, org, app)).toBe(true);
    });

    it('should return false when org does not match', () => {
      const query = createQueryWithKey(['SomeQueryKey', 'otherOrg', app]);
      expect(isAppSpecificQuery(query, org, app)).toBe(false);
    });

    it('should return false when app does not match', () => {
      const query = createQueryWithKey(['SomeQueryKey', org, 'otherApp']);
      expect(isAppSpecificQuery(query, org, app)).toBe(false);
    });

    it('should return false when key has fewer than 3 elements', () => {
      const query = createQueryWithKey(['SomeQueryKey']);
      expect(isAppSpecificQuery(query, org, app)).toBe(false);
    });
  });
});
