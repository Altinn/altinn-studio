import { useCallback } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAppMutations } from 'src/core/queries/AppQueriesProvider';
import { invalidateFormBootstrapQueries } from 'src/core/queries/formBootstrap/formBootstrap.queries';
import { invalidateFormDataQueries } from 'src/core/queries/formData/formData.queries';
import { useInstanceDataQueryArgs } from 'src/core/queries/instance';
import { instanceQueryKeys } from 'src/core/queries/instance/instance.queries';
import { mutationResult } from 'src/core/queries/mutationResult';
import { getProcessNextMutationKey, PROCESS_RESUME_MUTATION_KEY } from 'src/core/queries/process/process.queries';
import type { ProcessNextProblemDetails } from 'src/core/api-client/process.types';
import type { BackendValidationIssue } from 'src/features/validation';
import type { IActionType, IInstance } from 'src/types/shared';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

type ProcessNextResult = readonly [IInstance | null, BackendValidationIssue[] | null];
type ProcessError = HttpClientError<ProcessNextProblemDetails | undefined>;

interface ProcessMutationOptions {
  instanceId: string | undefined;
  onWorkflowFailure: () => Promise<void>;
  onError: (error: ProcessError) => Promise<void>;
}

interface ProcessNextMutationOptions extends ProcessMutationOptions {
  language: string;
  action: IActionType | undefined;
  beforeProcessNext: () => Promise<boolean | undefined>;
  onSuccess: (result: ProcessNextResult) => Promise<void>;
}

export function useProcessNextMutation({
  instanceId,
  language,
  action,
  beforeProcessNext,
  onWorkflowFailure,
  onSuccess,
  onError,
}: ProcessNextMutationOptions) {
  const { doProcessNext } = useAppMutations();
  const mutation = useMutation({
    scope: { id: 'process/next' },
    mutationKey: getProcessNextMutationKey(action),
    mutationFn: async (): Promise<ProcessNextResult> => {
      if (await beforeProcessNext()) {
        return [null, null];
      }
      if (!instanceId) {
        throw new Error('Missing instance ID. Cannot perform process/next.');
      }
      return doProcessNext(instanceId, language, action)
        .then(({ data: instance }) => [instance, null] as const)
        .catch(async (error: ProcessError): Promise<ProcessNextResult> => {
          const validationIssues = error.response?.data?.validationIssues;
          if (error.response?.status === 409 && validationIssues?.length) {
            return [null, validationIssues];
          }
          const { processNextState, workflowFailure } = error.response?.data ?? {};
          if (processNextState === 'retrying' || processNextState === 'resumeRequired' || workflowFailure) {
            await onWorkflowFailure();
            return [null, null];
          }
          throw error;
        });
    },
    onSuccess,
    onError,
  });
  return mutationResult(mutation);
}

export function useProcessResumeMutation({
  instanceId,
  onWorkflowFailure,
  onSuccess,
  onError,
}: ProcessMutationOptions & { onSuccess: (resumed: boolean) => Promise<void> }) {
  const { doProcessResume } = useAppMutations();
  const mutation = useMutation({
    scope: { id: 'process/next' },
    mutationKey: PROCESS_RESUME_MUTATION_KEY,
    mutationFn: async () => {
      if (!instanceId) {
        throw new Error('Missing instance ID. Cannot perform process/resume.');
      }
      return doProcessResume(instanceId)
        .then(() => true)
        .catch(async (error: ProcessError) => {
          const { processNextState, workflowFailure } = error.response?.data ?? {};
          if (processNextState === 'retrying' || processNextState === 'resumeRequired' || workflowFailure) {
            await onWorkflowFailure();
            return false;
          }
          throw error;
        });
    },
    onSuccess,
    onError,
  });
  return mutationResult(mutation);
}

export function useCommitProcessTransition() {
  const queryClient = useQueryClient();
  const { instanceOwnerPartyId, instanceGuid } = useInstanceDataQueryArgs();
  return useCallback(
    async (instance: IInstance, navigateToTask: () => void) => {
      if (instanceOwnerPartyId && instanceGuid) {
        const queryKey = instanceQueryKeys.instance({ instanceOwnerPartyId, instanceGuid });
        // An earlier read must not overwrite the transition result.
        await queryClient.cancelQueries({ queryKey });
        // Publish the instance and navigate in the same turn so the old task never sees the new process.
        queryClient.setQueryData(queryKey, instance);
      }
      navigateToTask();
      await invalidateFormDataQueries(queryClient);
    },
    [queryClient, instanceOwnerPartyId, instanceGuid],
  );
}

export function useInvalidateProcessFormData() {
  const queryClient = useQueryClient();
  return useCallback(
    async (includeBootstrap = false) => {
      await Promise.all([
        invalidateFormDataQueries(queryClient),
        ...(includeBootstrap ? [invalidateFormBootstrapQueries(queryClient)] : []),
      ]);
    },
    [queryClient],
  );
}
