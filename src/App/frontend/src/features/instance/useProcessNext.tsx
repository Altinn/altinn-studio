import React from 'react';
import { toast } from 'react-toastify';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useUpdateInitialValidations } from 'src/core/queries/backendValidation';
import { FormStore } from 'src/features/form/FormContext';
import { invalidateFormDataQueries } from 'src/features/formData/useFormDataQuery';
import { useHasPendingScans, useInstanceDataQuery, useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useOptimisticallyUpdateProcess, useProcessQuery } from 'src/features/instance/useProcessQuery';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useOnFormSubmitValidation } from 'src/features/validation/callbacks/onFormSubmitValidation';
import { useNavigateToTask } from 'src/hooks/useNavigatePage';
import { doProcessNext } from 'src/queries/queries';
import { TaskKeys } from 'src/routesBuilder';
import type { BackendValidationIssue } from 'src/features/validation';
import type { IActionType, IProcess, ProblemDetails } from 'src/types/shared';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

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
  const { data: process, refetch: refetchProcessData } = useProcessQuery();
  const navigateToTask = useNavigateToTask();
  const instanceId = useLaxInstanceId();
  const queryClient = useQueryClient();
  const hasPendingScans = useHasPendingScans();
  const optimisticallyUpdateProcess = useOptimisticallyUpdateProcess();

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
        .then(({ data: process }) => [process, null] as const)
        .catch((error) => {
          if (error.response?.status === 409 && error.response?.data?.['validationIssues']?.length) {
            // If process next failed due to validation, return validationIssues instead of throwing
            return [null, error.response.data['validationIssues'] as BackendValidationIssue[]] as const;
          } else if (error.response?.status === 500 && error.response?.data?.['detail'] === 'Pdf generation failed') {
            // If process next fails due to the PDF generator failing, don't show unknown error if the app unlocks data elements
            toast(<Lang id='process_error.submit_error_please_retry' />, { type: 'error', autoClose: false });
            return [null, null];
          } else {
            throw error;
          }
        });
    },
    onSuccess: async ([processData, validationIssues]) => {
      if (processData) {
        optimisticallyUpdateProcess(processData);
        await Promise.all([refetchProcessData(), reFetchInstanceData()]);
        await invalidateFormDataQueries(queryClient);

        const task = getTargetTaskFromProcess(processData);
        if (!task) {
          throw new Error('Missing task in process data. Cannot navigate to task.');
        }
        navigateToTask(task);
      } else if (validationIssues) {
        if (!onValidationIssues) {
          throw new Error(
            'Process next returned validation issues outside a form context. This task cannot represent validation issues without a FormProvider.',
          );
        }

        await onValidationIssues(validationIssues);
      }
    },
    onError: async (error: HttpClientError<ProblemDetails | undefined>) => {
      window.logError('Process next failed:\n', error);

      const { data: newProcess } = await refetchProcessData();
      const newCurrentTask = newProcess?.currentTask;

      if (newCurrentTask?.elementId && newCurrentTask?.elementId !== process?.currentTask?.elementId) {
        await reFetchInstanceData();
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

export function getTargetTaskFromProcess(processData: IProcess | undefined) {
  if (!processData) {
    return undefined;
  }

  return processData.ended || !processData.currentTask ? TaskKeys.ProcessEnd : processData.currentTask.elementId;
}
