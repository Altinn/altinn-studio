import type { QueryClient } from '@tanstack/react-query';

import { createExternalApiQueries } from 'src/core/queries/externalApi/externalApi.queries';
import { createCachedInstanceQueries } from 'src/core/queries/instance/instance.queries';
import { createTextResourcesQueries } from 'src/core/queries/textResources/textResources.queries';
import type { QueryCacheObserver } from 'src/core/queries/expressionQueryReaders';
import type { AppQueries } from 'src/core/queries/types';

export function createExpressionQueryReaders(
  queryClient: QueryClient,
  api: Pick<AppQueries, 'fetchExternalApi' | 'fetchTextResources'>,
) {
  return {
    instanceQueries: createCachedInstanceQueries(queryClient),
    queryCacheObserver: createQueryCacheObserver(queryClient),
    externalApiQueries: createExternalApiQueries(queryClient, api),
    textResourceQueries: createTextResourcesQueries(queryClient, api),
  };
}

export function createQueryCacheObserver(queryClient: QueryClient): QueryCacheObserver {
  const listeners = new Set<() => void>();
  let unsubscribeCache: (() => void) | undefined;

  return {
    subscribe: (onChange) => {
      listeners.add(onChange);
      unsubscribeCache ??= queryClient.getQueryCache().subscribe((event) => {
        if (event.type !== 'added' && event.type !== 'updated' && event.type !== 'removed') {
          return;
        }
        listeners.forEach((listener) => listener());
      });

      return () => {
        listeners.delete(onChange);
        if (listeners.size === 0) {
          unsubscribeCache?.();
          unsubscribeCache = undefined;
        }
      };
    },
  };
}
