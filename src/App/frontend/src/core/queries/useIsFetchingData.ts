import { useCallback, useSyncExternalStore } from 'react';

import { notifyManager, useQueryClient } from '@tanstack/react-query';
import type { QueryCacheNotifyEvent, QueryFilters } from '@tanstack/react-query';

/**
 * Only these query cache events can change whether a query is fetching. The observer events
 * (observerAdded, observerRemoved, observerResultsUpdated, observerOptionsUpdated) cannot, and a form with many
 * rows emits thousands of them while mounting. TanStack's own useIsFetching() rescans the whole cache on every one
 * of them, which grows with rows × queries.
 */
const fetchStateEvents: ReadonlySet<QueryCacheNotifyEvent['type']> = new Set(['added', 'removed', 'updated']);

/**
 * Like useIsFetching() from TanStack Query, but only re-checks when a query is added, removed or changes state.
 * The filters are limited to the query key, because other filters (such as `type: 'active'`) depend on observers.
 */
export function useIsFetchingQueries(filters?: Pick<QueryFilters, 'queryKey' | 'exact'>): boolean {
  const queryClient = useQueryClient();
  const queryCache = queryClient.getQueryCache();

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const notify = notifyManager.batchCalls(onStoreChange);
      return queryCache.subscribe((event) => {
        if (fetchStateEvents.has(event.type)) {
          notify();
        }
      });
    },
    [queryCache],
  );

  const getSnapshot = () => queryClient.isFetching(filters) > 0;
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useIsFetchingData() {
  return useIsFetchingQueries();
}

export function useIsFetchingDataNow() {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.isFetching() > 0, [queryClient]);
}
