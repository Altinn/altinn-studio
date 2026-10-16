import { useQueries } from '@tanstack/react-query';

import { getExternalApiQueryDef } from 'src/core/queries/externalApi/externalApi.queries';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';

export type ExternalApisResult = { data: Record<string, unknown>; errors: Record<string, Error> };

/**
 * Narrow cache and fetch API for external-api queries.
 * This keeps TanStack Query details inside src/core/queries while still supporting lazy expression reads.
 */
export interface ExternalApiQueries {
  ensureLoaded: (instanceId: string | undefined, externalApiIds: string[]) => void;
  getCached: (instanceId: string | undefined, externalApiIds: string[]) => ExternalApisResult;
  /** Opaque identity that changes when cached data or fetch state changes. */
  getSnapshot: (instanceId: string | undefined, externalApiId: string) => object | undefined;
}

export function useExternalApis(ids: string[]): ExternalApisResult {
  const instanceId = useLaxInstanceId();
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
