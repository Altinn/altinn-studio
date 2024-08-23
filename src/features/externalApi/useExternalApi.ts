import { skipToken, useQueries, useQuery } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';

import { useLaxInstance } from 'src/features/instance/InstanceContext';
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
    staleTime: 1000 * 60 * 10, // 10 minutes
  };
}

export function useExternalApis(ids: string[]): ExternalApisResult {
  const instanceId = useLaxInstance()?.instanceId;
  const queries = ids.map((externalApiId) => ({
    ...getExternalApiQueryDef({ externalApiId, instanceId }),
  }));

  return useQueries({
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

      Object.entries(errors).forEach(([id, error]) => {
        window.logErrorOnce(`Failed to fetch external API ${id}`, error);
      });

      return { data, errors };
    },
  });
}

export function useExternalApi(id: string): unknown {
  const instanceId = useLaxInstance()?.instanceId;

  return useQuery(getExternalApiQueryDef({ externalApiId: id, instanceId }));
}
