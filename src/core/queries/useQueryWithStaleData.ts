import { useRef } from 'react';

import { useQuery } from '@tanstack/react-query';
import type { QueryKey, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';

/**
 * A custom hook that returns the same data as useQuery, but returns the last successful response if the query is
 * loading. This is useful for cases where you don't want to show a loading indicator when the queryKey changes,
 * and it's fine to show the last successful response while the new data is loading.
 *
 * Beware that if your TData (i.e. the query result) can be undefined, this may not work as expected.
 */
export function useQueryWithStaleData<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'initialData'> & {
    initialData?: () => undefined;
  },
): UseQueryResult<TData, TError> {
  const lastResponseRef = useRef<TData | undefined>(undefined);
  const utils = useQuery<TQueryFnData, TError, TData, TQueryKey>(options);

  if (utils.isLoading && lastResponseRef.current) {
    return {
      ...utils,
      data: lastResponseRef.current,
      isLoading: false,
    } as unknown as UseQueryResult<TData, TError>;
  }

  if (utils.data) {
    lastResponseRef.current = utils.data;
  }

  return utils;
}
