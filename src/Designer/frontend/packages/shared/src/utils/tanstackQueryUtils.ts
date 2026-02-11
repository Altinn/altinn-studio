import type { Query, QueryStatus } from '@tanstack/react-query';

/**
 * Merges multiple query statuses into one.
 * @param queryStatuses Query statuses to merge.
 * @returns Merged query status.
 */
export const mergeQueryStatuses = (...queryStatuses: QueryStatus[]): QueryStatus => {
  if (queryStatuses.includes('error')) return 'error';
  if (queryStatuses.includes('pending')) return 'pending';
  return 'success';
};

export const isAppSpecificQuery = (query: Query, org: string, app: string) => {
  const key = query.queryKey;
  return key[1] === org && key[2] === app;
};
