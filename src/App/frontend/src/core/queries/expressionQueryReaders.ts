import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import { useExternalApiClient } from 'src/core/contexts/ApiProvider';
import { createQueryCacheObserver } from 'src/core/queries/expressionQueryReaders.queries';
import { createExternalApiQueries } from 'src/core/queries/externalApi/externalApi.queries';
import { createCachedInstanceQueries } from 'src/core/queries/instance/instance.queries';
import { createTextResourcesQueries } from 'src/core/queries/textResources/textResources.queries';
import type { ExternalApiClient } from 'src/core/api-client/app.api';

export type ExpressionQueryReaders = ReturnType<typeof createExpressionQueryReaders>;

const readersByClient = new WeakMap<QueryClient, WeakMap<ExternalApiClient, ExpressionQueryReaders>>();

export function useExpressionQueryReaders(): ExpressionQueryReaders {
  const queryClient = useQueryClient();
  const api = useExternalApiClient();
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

function createExpressionQueryReaders(queryClient: QueryClient, api: ExternalApiClient) {
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
