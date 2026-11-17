import React from 'react';
import { toast } from 'react-toastify';

import { useUpdateInitialValidations } from 'src/core/queries/backendValidation';
import { useInstanceDataQuery } from 'src/core/queries/instance';
import {
  useCommitProcessTransition,
  useInvalidateProcessFormData,
  useProcessNextMutation,
  useProcessResumeMutation,
} from 'src/core/queries/process';
import { FormStore } from 'src/features/form/FormContext';
import { useHasPendingScans, useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { usePdfModeActive } from 'src/features/pdf/PdfWrapper';
import { useOnFormSubmitValidation } from 'src/features/validation/callbacks/onFormSubmitValidation';
import { useNavigateToTask } from 'src/hooks/useNavigatePage';
import { TaskKeys } from 'src/routesBuilder';
import type { ProcessNextProblemDetails } from 'src/core/api-client/process.types';
import type { BackendValidationIssue } from 'src/features/validation';
import type { IActionType, IInstance, IProcess } from 'src/types/shared';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

interface ProcessNextProps {
  action?: IActionType;
}

interface ProcessNextInternalProps extends ProcessNextProps {
  beforeProcessNext?: () => Promise<boolean>;
  onValidationIssues?: (validationIssues: BackendValidationIssue[]) => Promise<void>;
}

function useProcessNextInternal({ action, beforeProcessNext, onValidationIssues }: ProcessNextInternalProps = {}) {
  const reFetchInstanceData = useInstanceDataQuery({ enabled: false }).refetch;
  const refreshProcess = useRefreshProcess();
  const language = useCurrentLanguage();
  const navigateToTask = useNavigateToTask();
  const instanceId = useLaxInstanceId();
  const commitTransition = useCommitProcessTransition();
  const invalidateFormData = useInvalidateProcessFormData();
  const hasPendingScans = useHasPendingScans();
  const isPdfMode = usePdfModeActive();

  return useProcessNextMutation({
    instanceId,
    language,
    action,
    beforeProcessNext: async () => {
      if (hasPendingScans) {
        await reFetchInstanceData();
      }
      return await beforeProcessNext?.();
    },
    onSuccess: async (outcome) => {
      if (outcome.kind === 'refreshWorkflow') {
        const result = await refreshProcess();
        if (result.error) {
          throw result.error;
        }
      } else if (outcome.kind === 'transitioned') {
        const task = getTargetTaskFromProcess(outcome.instance.process);
        if (!task) {
          throw new Error('Missing task in process data. Cannot navigate to task.');
        }

        await commitTransition(outcome.instance, () => navigateToTask(task));
      } else if (outcome.kind === 'validationRejected') {
        if (!onValidationIssues) {
          throw new Error(
            'Process next returned validation issues outside a form context. This task cannot represent validation issues without a FormProvider.',
          );
        }

        await onValidationIssues(outcome.validationIssues);
      }
    },
    onError: async (error: HttpClientError<ProcessNextProblemDetails | undefined>) => {
      window.logError('Process next failed:\n', error);

      const { data: newInstance } = await refreshProcess();

      const instanceChanged = error.response?.data?.processNextState === 'instanceChanged';
      if (instanceChanged) {
        // Bootstrap initializes FormStore; form data queries alone cannot refresh editable fields.
        await invalidateFormData(true);
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
  const refreshProcess = useRefreshProcess();
  const instanceId = useLaxInstanceId();
  const invalidateFormData = useInvalidateProcessFormData();
  const isPdfMode = usePdfModeActive();

  return useProcessResumeMutation({
    instanceId,
    onSuccess: async (outcome) => {
      // Failed workflows are not polled, and resume returns no instance.
      const result = await refreshProcess();
      if (outcome.kind === 'refreshWorkflow') {
        if (result.error) {
          throw result.error;
        }
        return;
      }

      await invalidateFormData();
    },
    onError: async (error: HttpClientError<ProcessNextProblemDetails | undefined>) => {
      window.logError('Process resume failed:\n', error);

      // A concurrent session may have resumed already.
      const { data: newInstance } = await refreshProcess();

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

function useRefreshProcess() {
  const refetch = useInstanceDataQuery({ enabled: false }).refetch;
  const navigateToTask = useNavigateToTask();

  return async () => {
    const result = await refetch();
    const task = getTargetTaskFromProcess(result.data?.process);
    if (task) {
      navigateToTask(task);
    }
    return result;
  };
}

// Server error details are for logs; users receive a localized retry message.
function getProcessErrorTextId(error: HttpClientError<ProcessNextProblemDetails | undefined>) {
  if (error.response?.data?.processNextState === 'concurrentTransition') {
    return 'process_error.concurrent_transition';
  }

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
