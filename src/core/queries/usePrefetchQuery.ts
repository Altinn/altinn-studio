import { useQuery } from '@tanstack/react-query';
import type { QueryFunction, QueryKey, SkipToken, UseQueryOptions } from '@tanstack/react-query';

export type QueryDefinition<T> = {
  queryKey: QueryKey;
  queryFn: QueryFunction<T> | SkipToken;
  enabled?: boolean;
  gcTime?: UseQueryOptions<T>['gcTime'];
  staleTime?: UseQueryOptions<T>['staleTime'];
  refetchInterval?: UseQueryOptions<T>['refetchInterval'];
};

// @see https://tanstack.com/query/v5/docs/framework/react/guides/prefetching
export function usePrefetchQuery<T>(def: QueryDefinition<T>, enabled = true) {
  useQuery({
    ...def,
    enabled: enabled && def.enabled,
    notifyOnChangeProps: [],
  });
}
