import React from 'react';
import { toast } from 'react-toastify';

import { useUpdateInitialValidations } from 'src/core/queries/backendValidation';
import { instanceQueryKeys, useCurrentInstance } from 'src/core/queries/instance';
import { useMutation, useQueryClient } from 'src/core/queries/reactQuery';
import { FormStore } from 'src/features/form/FormContext';
import { invalidateFormBootstrapQueries } from 'src/features/formBootstrap/useFormBootstrapQuery';
import { invalidateFormDataQueries } from 'src/features/formData/useFormDataQuery';
import {
  useHasPendingScans,
  useInstanceDataQuery,
  useInstanceDataQueryArgs,
  useLaxInstanceId,
} from 'src/features/instance/InstanceContext';
import { getProcessNextMutationKey, PROCESS_RESUME_MUTATION_KEY } from 'src/features/instance/processNextMutationKey';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { usePdfModeActive } from 'src/features/pdf/PdfWrapper';
import { useOnFormSubmitValidation } from 'src/features/validation/callbacks/onFormSubmitValidation';
import { useNavigateToTask } from 'src/hooks/useNavigatePage';
import { doProcessNext, doProcessResume } from 'src/queries/queries';
import { TaskKeys } from 'src/routesBuilder';
import type { BackendValidationIssue } from 'src/features/validation';
import type { IActionType, IInstance, IProcess, IProcessWorkflowFailure, ProblemDetails } from 'src/types/shared';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

type ProcessNextProblemDetails = ProblemDetails & {
  validationIssues?: BackendValidationIssue[] | null;
  processNextState?: 'retrying' | 'resumeRequired' | 'instanceChanged';
  workflowFailure?: IProcessWorkflowFailure;
};

interface ProcessNextProps {
  action?: IActionType;
}

interface ProcessNextInternalProps extends ProcessNextProps {
  beforeProcessNext?: () => Promise<boolean>;
  onValidationIssues?: (validationIssues: BackendValidationIssue[]) => Promise<void>;
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
  const isPdfMode = usePdfModeActive();

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
            return [null, validationIssues] as const;
          }

          // Refetched workflow status drives the same recovery screens as polling.
          const processNextState = error.response?.data?.processNextState;
          const workflowFailure = error.response?.data?.workflowFailure;
          if (processNextState === 'resumeRequired' || workflowFailure) {
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

        // Older reads can overwrite the transition result.
        if (instanceOwnerPartyId && instanceGuid) {
          await queryClient.cancelQueries({
            queryKey: instanceQueryKeys.instance({ instanceOwnerPartyId, instanceGuid }),
          });
        }

        // Batch the cache update with navigation so the old task does not render against the new process.
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

      const instanceChanged = error.response?.data?.processNextState === 'instanceChanged';
      if (instanceChanged) {
        // Bootstrap initializes FormStore; legacy data queries alone cannot refresh editable fields.
        await Promise.all([invalidateFormBootstrapQueries(queryClient), invalidateFormDataQueries(queryClient)]);
      }

      if (newCurrentTask?.elementId && newCurrentTask?.elementId !== process?.currentTask?.elementId) {
        navigateToTask(newCurrentTask.elementId);
      }

      if (!isPdfMode && isRenderedByWorkflowStateMachine(newInstance)) {
        return;
      }

      const textId = instanceChanged ? 'process_error.instance_changed' : getProcessErrorTextId(error);
      toast(<Lang id={textId} />, {
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

// Resume shares the process/next scope, but its separate key keeps the failed task mounted until polling sees progress.
export function useProcessResume() {
  const reFetchInstanceData = useInstanceDataQuery({ enabled: false }).refetch;
  const process = useCurrentInstance()?.process;
  const navigateToTask = useNavigateToTask();
  const instanceId = useLaxInstanceId();
  const queryClient = useQueryClient();
  const isPdfMode = usePdfModeActive();

  return useMutation({
    scope: { id: 'process/next' },
    mutationKey: PROCESS_RESUME_MUTATION_KEY,
    mutationFn: async () => {
      if (!instanceId) {
        throw new Error('Missing instance ID. Cannot perform process/resume.');
      }

      return doProcessResume(instanceId)
        .then(() => true)
        .catch(async (error: HttpClientError<ProcessNextProblemDetails | undefined>) => {
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

      // Failed workflows are not polled, and resume returns no instance.
      const { data: newInstance } = await reFetchInstanceData();
      const task = getTargetTaskFromProcess(newInstance?.process);
      if (task) {
        navigateToTask(task);
      }
      await invalidateFormDataQueries(queryClient);
    },
    onError: async (error: HttpClientError<ProcessNextProblemDetails | undefined>) => {
      window.logError('Process resume failed:\n', error);

      // A concurrent session may have resumed already.
      const { data: newInstance } = await reFetchInstanceData();
      const newCurrentTask = newInstance?.process?.currentTask;

      if (newCurrentTask?.elementId && newCurrentTask?.elementId !== process?.currentTask?.elementId) {
        navigateToTask(newCurrentTask.elementId);
      }

      if (!isPdfMode && isRenderedByWorkflowStateMachine(newInstance)) {
        return;
      }

      toast(<Lang id={getProcessErrorTextId(error)} />, {
        type: 'error',
        autoClose: false,
      });
    },
  });
}

// Server error details are for logs; users receive a localized retry message.
function getProcessErrorTextId(error: HttpClientError<ProcessNextProblemDetails | undefined>) {
  if ((error.response?.status ?? 0) >= 500) {
    return 'process_error.submit_error_please_retry';
  }

  return error.response?.data?.detail ?? error.message ?? 'process_error.submit_error_please_retry';
}

function isRenderedByWorkflowStateMachine(instance: IInstance | undefined) {
  const status = instance?.process?.workflow?.status;
  return status === 'processing' || status === 'failed';
}

export function getTargetTaskFromProcess(processData: IProcess | undefined) {
  if (!processData) {
    return undefined;
  }

  return processData.ended || !processData.currentTask ? TaskKeys.ProcessEnd : processData.currentTask.elementId;
}
