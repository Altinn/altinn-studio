import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { WorkflowCollectionListResponse } from 'admin/features/apps/types/workflows/WorkflowCollection';
import type { WorkflowHealthLookup } from 'admin/features/apps/utils/workflowHealth';
import { mergeWorkflowHealth } from 'admin/features/apps/utils/workflowHealth';
import { workflowCollectionsPath } from 'admin/features/apps/utils/apiPaths';
import { getWorkflowEngineResource } from 'admin/features/apps/utils/workflowEngineRequests';

/**
 * Keys per annotate request. Matches the instance list's page size so loading one more page of
 * instances costs exactly one more health request and leaves the already-fetched pages cached.
 * Must stay at or below the engine's `MaxPageSize` (100): annotate rejects rather than truncates a
 * key list, because silently dropping keys would let their failures pass as healthy.
 */
export const WORKFLOW_HEALTH_KEYS_PER_REQUEST = 10;

export type InstancesWorkflowHealth = WorkflowHealthLookup & {
  isPending: boolean;
};

/**
 * Workflow-engine health for the instances currently loaded in the list, in annotate mode.
 *
 * Never surfaces an error: a failing or unavailable engine degrades to `NoData`/`Unavailable` on the
 * health column (`hideDefaultError` keeps the global toast away), because the instance list comes
 * from Storage and must never be gated on the engine.
 */
export const useInstancesWorkflowHealthQuery = (
  org: string,
  env: string,
  app: string,
  instanceGuids: string[],
): InstancesWorkflowHealth => {
  const joinedGuids = instanceGuids.join(',');
  const chunks = useMemo(
    () => chunkKeys(joinedGuids ? joinedGuids.split(',') : [], WORKFLOW_HEALTH_KEYS_PER_REQUEST),
    [joinedGuids],
  );

  return useQueries({
    queries: chunks.map((keys) => ({
      queryKey: [QueryKey.AppInstancesWorkflowHealth, org, env, app, keys],
      queryFn: async ({ signal }: { signal: AbortSignal }) =>
        getWorkflowEngineResource<WorkflowCollectionListResponse>(
          workflowCollectionsPath(org, env, app, { keys }),
          signal,
        ),
      meta: { hideDefaultError: true },
    })),
    combine: (results) => ({
      ...mergeWorkflowHealth(
        results.map((result, index) => ({
          keys: chunks[index],
          isPending: result.isPending,
          data: result.data,
          error: result.error,
        })),
      ),
      isPending: results.some((result) => result.isPending),
    }),
  });
};

function chunkKeys(keys: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < keys.length; index += size) {
    chunks.push(keys.slice(index, index + size));
  }
  return chunks;
}
