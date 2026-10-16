import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import { createQueryCacheObserver } from 'src/core/queries/expressionQueryReaders.queries';
import { createExternalApiQueries } from 'src/core/queries/externalApi/externalApi.queries';
import { createCachedInstanceQueries } from 'src/core/queries/instance/instance.queries';
import { createTextResourcesQueries } from 'src/core/queries/textResources/textResources.queries';

export type ExpressionQueryReaders = ReturnType<typeof createExpressionQueryReaders>;

const readersByClient = new WeakMap<QueryClient, ExpressionQueryReaders>();

export function useExpressionQueryReaders(): ExpressionQueryReaders {
  const queryClient = useQueryClient();
  const cached = readersByClient.get(queryClient);
  if (cached) {
    return cached;
  }

  const readers = createExpressionQueryReaders(queryClient);
  readersByClient.set(queryClient, readers);
  return readers;
}

function createExpressionQueryReaders(queryClient: QueryClient) {
  return {
    instanceQueries: createCachedInstanceQueries(queryClient),
    queryCacheObserver: createQueryCacheObserver(queryClient),
    externalApiQueries: createExternalApiQueries(queryClient),
    textResourceQueries: createTextResourcesQueries(queryClient),
  };
}

/**
 * Minimal query-cache observer API for code outside src/core/queries.
 * Consumers can react to cache changes without depending on TanStack Query types or client methods directly.
 */
export interface QueryCacheObserver {
  subscribe: (onChange: () => void) => () => void;
}
