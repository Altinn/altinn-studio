import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/queries/AppQueriesProvider';
import { createQueryCacheObserver } from 'src/core/queries/expressionQueryReaders.queries';
import { createExternalApiQueries } from 'src/core/queries/externalApi/externalApi.queries';
import { createCachedInstanceQueries } from 'src/core/queries/instance/instance.queries';
import { createTextResourcesQueries } from 'src/core/queries/textResources/textResources.queries';
import type { AppQueries } from 'src/core/queries/types';

export type ExpressionQueryReaders = ReturnType<typeof createExpressionQueryReaders>;

const readersByClient = new WeakMap<
  QueryClient,
  WeakMap<Pick<AppQueries, 'fetchExternalApi'>, ExpressionQueryReaders>
>();

export function useExpressionQueryReaders(): ExpressionQueryReaders {
  const queryClient = useQueryClient();
  const api = useAppQueries();
  let byApi = readersByClient.get(queryClient);
  if (!byApi) {
    byApi = new WeakMap();
    readersByClient.set(queryClient, byApi);
  }
  const cached = byApi.get(api);
  if (cached) {
    return cached;
  }

  const readers = createExpressionQueryReaders(queryClient, api);
  byApi.set(api, readers);
  return readers;
}

function createExpressionQueryReaders(queryClient: QueryClient, api: Pick<AppQueries, 'fetchExternalApi'>) {
  return {
    instanceQueries: createCachedInstanceQueries(queryClient),
    queryCacheObserver: createQueryCacheObserver(queryClient),
    externalApiQueries: createExternalApiQueries(queryClient, api),
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
