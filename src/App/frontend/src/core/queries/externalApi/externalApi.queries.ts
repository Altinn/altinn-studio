import { skipToken } from '@tanstack/react-query';
import type { QueryClient, UseQueryOptions } from '@tanstack/react-query';

import type { ExternalApiClient } from 'src/core/api-client/app.api';
import type { ExternalApiQueries } from 'src/core/queries/externalApi';
export function getExternalApiQueryDef({
  externalApiId,
  instanceId,
  api,
}: {
  api: ExternalApiClient;
  externalApiId: string;
  instanceId: string | undefined;
}): UseQueryOptions<unknown, Error> {
  return {
    queryKey: ['fetchExternalApi', instanceId, externalApiId],
    queryFn: instanceId ? async () => api.fetchExternalApi({ instanceId, externalApiId }) : skipToken,
    staleTime: 1000 * 60 * 10,
  };
}

export function createExternalApiQueries(queryClient: QueryClient, api: ExternalApiClient): ExternalApiQueries {
  const snapshots = new WeakMap<object, object>();
  return {
    ensureLoaded: (instanceId, externalApiIds) => {
      if (!instanceId) {
        return;
      }

      for (const externalApiId of externalApiIds) {
        const queryDef = getExternalApiQueryDef({ externalApiId, instanceId, api });
        if (queryClient.getQueryState(queryDef.queryKey)?.fetchStatus === 'fetching') {
          continue;
        }
        if (queryClient.getQueryData(queryDef.queryKey) !== undefined) {
          continue;
        }
        void queryClient.ensureQueryData(queryDef);
      }
    },
    getCached: (instanceId, externalApiIds) => {
      const data: Record<string, unknown> = {};
      const errors: Record<string, Error> = {};

      for (const externalApiId of externalApiIds) {
        const queryDef = getExternalApiQueryDef({ externalApiId, instanceId, api });
        const queryState = queryClient.getQueryState(queryDef.queryKey);
        data[externalApiId] = queryClient.getQueryData(queryDef.queryKey);
        if (queryState?.error instanceof Error) {
          errors[externalApiId] = queryState.error;
        }
      }

      return { data, errors };
    },
    getSnapshot: (instanceId, externalApiId) => {
      const state = queryClient.getQueryState(getExternalApiQueryDef({ externalApiId, instanceId, api }).queryKey);
      if (!state) {
        return undefined;
      }
      let snapshot = snapshots.get(state);
      if (!snapshot) {
        snapshot = Object.freeze({});
        snapshots.set(state, snapshot);
      }
      return snapshot;
    },
  };
}
