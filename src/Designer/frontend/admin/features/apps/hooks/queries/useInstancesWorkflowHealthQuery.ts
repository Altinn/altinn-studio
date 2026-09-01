import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { WorkflowCollectionListResponse } from 'admin/features/apps/types/workflows/WorkflowCollection';
import type { WorkflowHealthLookup } from 'admin/features/apps/utils/workflowHealth';
import { mergeWorkflowHealth } from 'admin/features/apps/utils/workflowHealth';
import { workflowCollectionsPath } from 'admin/features/apps/utils/apiPaths';
import { getWorkflowEngineResource } from 'admin/features/apps/utils/workflowEngineRequests';

/**
 * Upper bound on keys per annotate request. Must stay at or below the engine's `MaxPageSize` (100):
 * annotate rejects rather than truncates a key list, because silently dropping keys would let their
 * failures pass as healthy. The instance list's page holds ten instances, so one loaded page
 * normally costs exactly one health request.
 */
export const WORKFLOW_HEALTH_MAX_KEYS_PER_REQUEST = 10;

/** Separates one instance page from the next in the memo fingerprint. Never part of a GUID. */
const PAGE_SEPARATOR = '|';

/**
 * Workflow-engine health for the instances currently loaded in the list, in annotate mode.
 *
 * Keys are requested per loaded instance page, not per slice of the accumulated list, so a page's
 * request is identified by its own contents alone: loading one more page adds exactly one request
 * and leaves the answered ones cached, whatever size the pages before it turned out to be.
 *
 * Never surfaces an error: a failing or unavailable engine degrades to `Unknown`/`Unavailable` on
 * the health column (`hideDefaultError` keeps the global toast away), because the instance list
 * comes from Storage and must never be gated on the engine.
 */
export const useInstancesWorkflowHealthQuery = (
  org: string,
  env: string,
  app: string,
  instanceGuidPages: string[][],
): WorkflowHealthLookup => {
  const pageFingerprint = instanceGuidPages.map((page) => page.join(',')).join(PAGE_SEPARATOR);
  const chunks = useMemo(() => chunkPages(pageFingerprint), [pageFingerprint]);

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
    combine: (results) =>
      mergeWorkflowHealth(
        results.map((result, index) => ({
          keys: chunks[index],
          isPending: result.isPending,
          data: result.data,
          error: result.error,
        })),
      ),
  });
};

/**
 * One key list per annotate request, from the fingerprint of the loaded pages.
 *
 * The fingerprint is the memo dependency, so the chunks are rebuilt from it rather than from the
 * page arrays, which are new on every render. A page larger than the per-request cap is split, and
 * the split depends on that page alone, so its parts stay identified by their own keys too.
 */
function chunkPages(pageFingerprint: string): string[][] {
  return pageFingerprint
    .split(PAGE_SEPARATOR)
    .filter((page) => page.length > 0)
    .flatMap((page) => chunkKeys(page.split(','), WORKFLOW_HEALTH_MAX_KEYS_PER_REQUEST));
}

function chunkKeys(keys: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < keys.length; index += size) {
    chunks.push(keys.slice(index, index + size));
  }
  return chunks;
}
