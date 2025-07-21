import React from 'react';
import { toast } from 'react-toastify';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ContextNotProvided } from 'src/core/contexts/context';
import { useDisplayError } from 'src/core/errorHandling/DisplayErrorProvider';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useHasPendingScans } from 'src/features/attachments/useHasPendingScans';
import { invalidateFormDataQueries } from 'src/features/formData/useFormDataQuery';
import { useLaxInstanceId, useStrictInstanceRefetch } from 'src/features/instance/InstanceContext';
import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useUpdateInitialValidations } from 'src/features/validation/backendValidation/backendValidationQuery';
import { appSupportsIncrementalValidationFeatures } from 'src/features/validation/backendValidation/backendValidationUtils';
import { useOnFormSubmitValidation } from 'src/features/validation/callbacks/onFormSubmitValidation';
import { Validation } from 'src/features/validation/validationContext';
import { TaskKeys, useNavigateToTask } from 'src/hooks/useNavigatePage';
import { doProcessNext } from 'src/queries/queries';
import { isAtLeastVersion } from 'src/utils/versionCompare';
import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { BackendValidationIssue } from 'src/features/validation';
import type { IActionType, IProcess, ProblemDetails } from 'src/types/shared';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

interface ProcessNextProps {
  action?: IActionType;
}

export function getProcessNextMutationKey(action?: IActionType) {
  if (!action) {
    return ['processNext'] as const;
  }
  return ['processNext', action] as const;
}

export function useProcessNext({ action }: ProcessNextProps = {}) {
  const reFetchInstanceData = useStrictInstanceRefetch();
  const language = useCurrentLanguage();
  const { data: process, refetch: refetchProcessData } = useProcessQuery();
  const navigateToTask = useNavigateToTask();
  const instanceId = useLaxInstanceId();
  const onFormSubmitValidation = useOnFormSubmitValidation();
  const updateInitialValidations = useUpdateInitialValidations();
  const setShowAllBackendErrors = Validation.useSetShowAllBackendErrors();
  const onSubmitFormValidation = useOnFormSubmitValidation();
  const applicationMetadata = useApplicationMetadata();
  const queryClient = useQueryClient();
  const displayError = useDisplayError();
  const hasPendingScans = useHasPendingScans();

  return useMutation({
    mutationKey: getProcessNextMutationKey(action),
    mutationFn: async () => {
      if (hasPendingScans) {
        await reFetchInstanceData();
      }

      const hasErrors = await onFormSubmitValidation();
      if (hasErrors) {
        return [null, null];
      }

      if (!instanceId) {
        throw new Error('Missing instance ID. Cannot perform process/next.');
      }

      return doProcessNext(instanceId, language, action)
        .then((process) => [process as IProcess, null] as const)
        .catch((error) => {
          if (error.response?.status === 409 && error.response?.data?.['validationIssues']?.length) {
            // If process next failed due to validation, return validationIssues instead of throwing
            return [null, error.response.data['validationIssues'] as BackendValidationIssue[]] as const;
          } else if (
            error.response?.status === 500 &&
            error.response?.data?.['detail'] === 'Pdf generation failed' &&
            appSupportsUnlockingOnProcessNextFailure(applicationMetadata)
          ) {
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
        await reFetchInstanceData();
        await refetchProcessData?.();
        await invalidateFormDataQueries(queryClient);
        const task = getTargetTaskFromProcess(processData);
        if (!task) {
          throw new Error('Missing task in process data. Cannot navigate to task.');
        }
        navigateToTask(task);
      } else if (validationIssues) {
        // Set initial validation to validation issues from process/next and make all errors visible
        updateInitialValidations(validationIssues, !appSupportsIncrementalValidationFeatures(applicationMetadata));
        if (!(await onSubmitFormValidation(true))) {
          setShowAllBackendErrors !== ContextNotProvided && setShowAllBackendErrors();
        }
      }
    },
    onError: async (error: HttpClientError<ProblemDetails | undefined>) => {
      window.logError('Process next failed:\n', error);

      if (!appSupportsUnlockingOnProcessNextFailure(applicationMetadata)) {
        displayError(error);
        return;
      }

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

function appSupportsUnlockingOnProcessNextFailure({ altinnNugetVersion }: ApplicationMetadata) {
  return !altinnNugetVersion || isAtLeastVersion({ actualVersion: altinnNugetVersion, minimumVersion: '8.1.0.115' });
}

export function getTargetTaskFromProcess(processData: IProcess | undefined) {
  if (!processData) {
    return undefined;
  }

  return processData.ended || !processData.currentTask ? TaskKeys.ProcessEnd : processData.currentTask.elementId;
}
