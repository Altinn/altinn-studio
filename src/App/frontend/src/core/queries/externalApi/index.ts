import { useEffect, useMemo } from 'react';

import { skipToken, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';

import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { fetchExternalApi } from 'src/queries/queries';

export type ExternalApisResult = { data: Record<string, unknown>; errors: Record<string, Error> };

function getExternalApiQueryDef({
  externalApiId,
  instanceId,
}: {
  externalApiId: string;
  instanceId: string | undefined;
}): UseQueryOptions<unknown, Error> {
  return {
    queryKey: ['fetchExternalApi', instanceId, externalApiId],
    queryFn: instanceId ? async () => fetchExternalApi({ instanceId, externalApiId }) : skipToken,
    staleTime: 1000 * 60 * 10,
  };
}

/**
 * Narrow cache and fetch API for external-api queries.
 * This keeps TanStack Query details inside src/core/queries while still supporting lazy expression reads.
 */
export interface ExternalApiQueries {
  ensureLoaded: (instanceId: string | undefined, externalApiIds: string[]) => void;
  getCached: (instanceId: string | undefined, externalApiIds: string[]) => ExternalApisResult;
}

export function useExternalApiQueries(): ExternalApiQueries {
  const queryClient = useQueryClient();

  return useMemo(
    () => ({
      ensureLoaded: (instanceId, externalApiIds) => {
        if (!instanceId) {
          return;
        }

        for (const externalApiId of externalApiIds) {
          const queryDef = getExternalApiQueryDef({ externalApiId, instanceId });
          if (queryClient.getQueryState(queryDef.queryKey)?.fetchStatus === 'fetching') {
            continue;
          }
          if (queryClient.getQueryData(queryDef.queryKey) !== undefined) {
            continue;
          }
          void queryClient.ensureQueryData(queryDef).catch(() => undefined);
        }
      },
      getCached: (instanceId, externalApiIds) => {
        const data: Record<string, unknown> = {};
        const errors: Record<string, Error> = {};

        for (const externalApiId of externalApiIds) {
          const queryDef = getExternalApiQueryDef({ externalApiId, instanceId });
          const queryState = queryClient.getQueryState(queryDef.queryKey);
          data[externalApiId] = queryClient.getQueryData(queryDef.queryKey);
          if (queryState?.error instanceof Error) {
            errors[externalApiId] = queryState.error;
          }
        }

        return { data, errors };
      },
    }),
    [queryClient],
  );
}

export function useExternalApis(ids: string[]): ExternalApisResult {
  const instanceId = useLaxInstanceId();
  const queries = ids.map((externalApiId) => ({
    ...getExternalApiQueryDef({ externalApiId, instanceId }),
  }));

  const combined = useQueries({
    queries,
    combine: (results) => {
      const data: Record<string, unknown> = {};
      const errors: Record<string, Error> = {};

      ids.forEach((externalApiId, idx) => {
        data[externalApiId] = results[idx].data;
        if (results[idx].error) {
          errors[externalApiId] = results[idx].error;
        }
      });

      return { data, errors };
    },
  });

  useEffect(() => {
    Object.entries(combined.errors).forEach(([id, error]) => {
      window.logErrorOnce(`Failed to fetch external API ${id}`, error);
    });
  }, [combined.errors]);

  return combined;
}

export function useExternalApi(id: string): unknown {
  const instanceId = useLaxInstanceId();
  return useQuery(getExternalApiQueryDef({ externalApiId: id, instanceId }));
}
