import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';

export type QueryDefinition<T> = UseQueryOptions<T>;

// @see https://tanstack.com/query/v5/docs/framework/react/guides/prefetching
export function usePrefetchQuery<T>(def: UseQueryOptions<T>, enabled = true) {
  useQuery({
    ...def,
    enabled: enabled && def.enabled,
    notifyOnChangeProps: [],
  });
}
