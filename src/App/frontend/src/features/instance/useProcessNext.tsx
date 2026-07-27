import React from 'react';
import { toast } from 'react-toastify';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useUpdateInitialValidations } from 'src/core/queries/backendValidation';
import { instanceQueryKeys, useCurrentInstance } from 'src/core/queries/instance';
import { FormStore } from 'src/features/form/FormContext';
import { invalidateFormDataQueries } from 'src/features/formData/useFormDataQuery';
import {
  useHasPendingScans,
  useInstanceDataQuery,
  useInstanceDataQueryArgs,
  useLaxInstanceId,
} from 'src/features/instance/InstanceContext';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useOnFormSubmitValidation } from 'src/features/validation/callbacks/onFormSubmitValidation';
import { useNavigateToTask } from 'src/hooks/useNavigatePage';
import { doProcessNext, doProcessResume } from 'src/queries/queries';
import { TaskKeys } from 'src/routesBuilder';
import type { BackendValidationIssue } from 'src/features/validation';
import type { IActionType, IInstance, IProcess, IProcessWorkflowFailure, ProblemDetails } from 'src/types/shared';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

type ProcessNextProblemDetails = ProblemDetails & {
  validationIssues?: BackendValidationIssue[] | null;
  processNextState?: 'retrying' | 'resumeRequired';
  workflowFailure?: IProcessWorkflowFailure;
};

interface ProcessNextProps {
  action?: IActionType;
}

interface ProcessNextInternalProps extends ProcessNextProps {
  beforeProcessNext?: () => Promise<boolean>;
  onValidationIssues?: (validationIssues: BackendValidationIssue[]) => Promise<void>;
}

export function getProcessNextMutationKey(action?: IActionType) {
  if (!action) {
    return ['processNext'] as const;
  }
  return ['processNext', action] as const;
}

function useProcessNextInternal({ action, beforeProcessNext, onValidationIssues }: ProcessNextInternalProps = {}) {
  const reFetchInstanceData = useInstanceDataQuery({ enabled: false }).refetch;
  const language = useCurrentLanguage();
  const process = useCurrentInstance()?.process;
  const navigateToTask = useNavigateToTask();
  const instanceId = useLaxInstanceId();
  const { instanceOwnerPartyId, instanceGuid } = useInstanceDataQueryArgs();
  const queryClient = useQueryClient();
  const hasPendingScans = useHasPendingScans();

  return useMutation({
    scope: { id: 'process/next' },
    mutationKey: getProcessNextMutationKey(action),
    mutationFn: async () => {
      if (hasPendingScans) {
        await reFetchInstanceData();
      }

      if (await beforeProcessNext?.()) {
        return [null, null];
      }

      if (!instanceId) {
        throw new Error('Missing instance ID. Cannot perform process/next.');
      }

      return doProcessNext(instanceId, language, action)
        .then(({ data: instance }) => [instance, null] as const)
        .catch(async (error: HttpClientError<ProcessNextProblemDetails | undefined>) => {
          const validationIssues = error.response?.data?.validationIssues;
          if (error.response?.status === 409 && validationIssues?.length) {
            // If process next failed due to validation, return validationIssues instead of throwing
            return [null, validationIssues] as const;
          }

          // The workflow engine can report a live status synchronously via the process/next error body.
          // Map it onto the same state machine ProcessWrapper drives off the polled workflow.status, so a
          // synchronous failure and a polled status render identically:
          //  - a blocked call (409 with processNextState): 'retrying' means the transition is still in
          //    flight (processing), 'resumeRequired' means it failed terminally (failed);
          //  - the failing/timed-out call itself (500/504 with a workflowFailure extension): the refetched
          //    status resolves to failed (terminal) or processing (timeout — the engine keeps retrying).
          // In all cases we refetch the (live-enriched) instance and swallow the error rather than showing
          // a hard toast — the refetched workflow.status takes over. The backend deliberately ships no raw
          // failure detail on these responses (only the coarse classification), so there is nothing more
          // meaningful to show than the state machine's localized screens.
          const processNextState = error.response?.data?.processNextState;
          const workflowFailure = error.response?.data?.workflowFailure;
          if (processNextState === 'retrying' || processNextState === 'resumeRequired' || workflowFailure) {
            const refetchResult = await reFetchInstanceData();
            if (refetchResult.isError) {
              throw refetchResult.error;
            }
            return [null, null] as const;
          }

          throw error;
        });
    },
    onSuccess: async ([newInstance, validationIssues]) => {
      if (newInstance) {
        const task = getTargetTaskFromProcess(newInstance.process);
        if (!task) {
          throw new Error('Missing task in process data. Cannot navigate to task.');
        }

        // Atomic flip: cache and navigate dispatch in the same task so React 18 batches both
        // into one commit. ProcessWrapper covers the cache/URL gap during the router's loading
        // state via useNavigation() and the useIsMutating() guard on this mutation.
        if (instanceOwnerPartyId && instanceGuid) {
          queryClient.setQueryData<IInstance>(
            instanceQueryKeys.instance({ instanceOwnerPartyId, instanceGuid }),
            newInstance,
          );
        }
        navigateToTask(task);
        await invalidateFormDataQueries(queryClient);
      } else if (validationIssues) {
        if (!onValidationIssues) {
          throw new Error(
            'Process next returned validation issues outside a form context. This task cannot represent validation issues without a FormProvider.',
          );
        }

        await onValidationIssues(validationIssues);
      }
    },
    onError: async (error: HttpClientError<ProcessNextProblemDetails | undefined>) => {
      window.logError('Process next failed:\n', error);

      const { data: newInstance } = await reFetchInstanceData();
      const newCurrentTask = newInstance?.process?.currentTask;

      if (newCurrentTask?.elementId && newCurrentTask?.elementId !== process?.currentTask?.elementId) {
        navigateToTask(newCurrentTask.elementId);
      }

      toast(<Lang id={error.response?.data?.detail ?? error.message ?? 'process_error.submit_error_please_retry'} />, {
        type: 'error',
        autoClose: false,
      });
    },
  });
}

export function useProcessNext({ action }: ProcessNextProps = {}) {
  const onFormSubmitValidation = useOnFormSubmitValidation();
  const updateInitialValidations = useUpdateInitialValidations();
  const setShowAllUnboundValidations = FormStore.validation.useSetShowAllUnboundValidations();

  return useProcessNextInternal({
    action,
    beforeProcessNext: async () => await onFormSubmitValidation(),
    onValidationIssues: async (validationIssues) => {
      // Set initial validation to validation issues from process/next and make all errors visible
      updateInitialValidations(validationIssues);

      const hasValidationErrors = await onFormSubmitValidation(true);
      if (!hasValidationErrors) {
        await setShowAllUnboundValidations();
      }
    },
  });
}

export function useProcessNextOutsideFormProvider({ action }: ProcessNextProps = {}) {
  return useProcessNextInternal({ action });
}

/**
 * Resumes the terminally failed workflow that owns the current task (POST process/resume). This is
 * the engine-era analogue of "retry the service task": the engine re-runs the failed step (and its
 * dependents) in place, whereas a plain process/next is rejected with 409/resumeRequired while the
 * workflow is failed. The mutation shares the process/next scope so a retry and a reject can never
 * run concurrently, but deliberately not its mutation key: the key gates ProcessWrapper's
 * full-screen loader, and the failed task view should stay mounted (button spinner) while resuming.
 */
export function useProcessResume() {
  const reFetchInstanceData = useInstanceDataQuery({ enabled: false }).refetch;
  const process = useCurrentInstance()?.process;
  const navigateToTask = useNavigateToTask();
  const instanceId = useLaxInstanceId();
  const queryClient = useQueryClient();

  return useMutation({
    scope: { id: 'process/next' },
    mutationKey: ['processResume'] as const,
    mutationFn: async () => {
      if (!instanceId) {
        throw new Error('Missing instance ID. Cannot perform process/resume.');
      }

      return doProcessResume(instanceId)
        .then(() => true)
        .catch(async (error: HttpClientError<ProcessNextProblemDetails | undefined>) => {
          // Same convergence rule as process/next: when the response is a workflow state the
          // polled status can represent (still retrying, failed again, timed out), refetch and let
          // ProcessWrapper's state machine render it instead of surfacing a hard error.
          const processNextState = error.response?.data?.processNextState;
          const workflowFailure = error.response?.data?.workflowFailure;
          if (processNextState === 'retrying' || processNextState === 'resumeRequired' || workflowFailure) {
            const refetchResult = await reFetchInstanceData();
            if (refetchResult.isError) {
              throw refetchResult.error;
            }
            return false;
          }

          throw error;
        });
    },
    onSuccess: async (resumed) => {
      if (!resumed) {
        return;
      }

      // The resume response carries only the process state, and instance polling is off while the
      // workflow is failed - so converge explicitly: refetch the instance (the source of truth the
      // process query derives from) and navigate to the settled task like a successful
      // process/next would have.
      const { data: newInstance } = await reFetchInstanceData();
      const task = getTargetTaskFromProcess(newInstance?.process);
      if (task) {
        navigateToTask(task);
      }
      await invalidateFormDataQueries(queryClient);
    },
    onError: async (error: HttpClientError<ProcessNextProblemDetails | undefined>) => {
      window.logError('Process resume failed:\n', error);

      // E.g. a concurrent session already resumed (409 "does not need to be resumed"): converge on
      // the fresh state before reporting anything.
      const { data: newInstance } = await reFetchInstanceData();
      const newCurrentTask = newInstance?.process?.currentTask;

      if (newCurrentTask?.elementId && newCurrentTask?.elementId !== process?.currentTask?.elementId) {
        navigateToTask(newCurrentTask.elementId);
      }

      toast(<Lang id={error.response?.data?.detail ?? error.message ?? 'process_error.submit_error_please_retry'} />, {
        type: 'error',
        autoClose: false,
      });
    },
  });
}

export function getTargetTaskFromProcess(processData: IProcess | undefined) {
  if (!processData) {
    return undefined;
  }

  return processData.ended || !processData.currentTask ? TaskKeys.ProcessEnd : processData.currentTask.elementId;
}
