import type { QueryClient, UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { QueryKey } from 'app-shared/types/QueryKey';
import { abandonWorkflowPath, resumeWorkflowPath } from 'admin/features/apps/utils/apiPaths';

/**
 * Resume always cascades. The engine's cascade drains the dependents this workflow left in
 * `DependencyFailed`, which is the same semantics the app runtime's own retry uses — a retry that
 * revived the head but stranded its side chains would leave the instance half-fixed.
 */
const RESUME_CASCADE = true;

export type WorkflowOpsContext = {
  org: string;
  env: string;
  app: string;
  /** The instance GUID whose drill-down and health entry must be refreshed after the verb. */
  collectionKey: string | undefined;
};

export const useResumeWorkflowMutation = (
  context: WorkflowOpsContext,
): UseMutationResult<void, unknown, string> => {
  const queryClient = useQueryClient();
  const { org, env, app } = context;

  return useMutation({
    mutationFn: async (workflowId: string) => {
      await axios.post(resumeWorkflowPath(org, env, app, workflowId, RESUME_CASCADE));
    },
    onSuccess: () => invalidateWorkflowQueries(queryClient, context),
    meta: { hideDefaultError: true },
  });
};

export const useAbandonWorkflowMutation = (
  context: WorkflowOpsContext,
): UseMutationResult<void, unknown, string> => {
  const queryClient = useQueryClient();
  const { org, env, app } = context;

  return useMutation({
    mutationFn: async (workflowId: string) => {
      await axios.post(abandonWorkflowPath(org, env, app, workflowId));
    },
    onSuccess: () => invalidateWorkflowQueries(queryClient, context),
    meta: { hideDefaultError: true },
  });
};

/**
 * Both verbs change the counts the traffic-light column and the discovery view are derived from, so
 * all three engine-backed queries for this app are invalidated — the health and problems keys by
 * prefix, since their full keys carry the page's key set and the failure filter.
 */
async function invalidateWorkflowQueries(
  queryClient: QueryClient,
  { org, env, app, collectionKey }: WorkflowOpsContext,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: [QueryKey.AppInstanceWorkflows, org, env, app, collectionKey],
    }),
    queryClient.invalidateQueries({
      queryKey: [QueryKey.AppInstancesWorkflowHealth, org, env, app],
    }),
    queryClient.invalidateQueries({
      queryKey: [QueryKey.AppWorkflowProblems, org, env, app],
    }),
  ]);
}
