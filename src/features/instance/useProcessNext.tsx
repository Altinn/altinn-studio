import React from 'react';
import { toast } from 'react-toastify';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAppMutations } from 'src/core/contexts/AppQueriesProvider';
import { ContextNotProvided } from 'src/core/contexts/context';
import { useDisplayError } from 'src/core/errorHandling/DisplayErrorProvider';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useHasPendingScans } from 'src/features/attachments/useHasPendingScans';
import { invalidateFormDataQueries } from 'src/features/formData/useFormDataQuery';
import { useLaxInstanceId, useStrictInstanceRefetch } from 'src/features/instance/InstanceContext';
import { useReFetchProcessData } from 'src/features/instance/ProcessContext';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useUpdateInitialValidations } from 'src/features/validation/backendValidation/backendValidationQuery';
import { appSupportsIncrementalValidationFeatures } from 'src/features/validation/backendValidation/backendValidationUtils';
import { useOnFormSubmitValidation } from 'src/features/validation/callbacks/onFormSubmitValidation';
import { Validation } from 'src/features/validation/validationContext';
import { useEffectEvent } from 'src/hooks/useEffectEvent';
import { TaskKeys, useNavigateToTask } from 'src/hooks/useNavigatePage';
import { isAtLeastVersion } from 'src/utils/versionCompare';
import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { BackendValidationIssue } from 'src/features/validation';
import type { IActionType, IProcess } from 'src/types/shared';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

interface ProcessNextProps {
  action?: IActionType;
}

export function useProcessNext() {
  const { doProcessNext } = useAppMutations();
  const reFetchInstanceData = useStrictInstanceRefetch();
  const language = useCurrentLanguage();
  const refetchProcessData = useReFetchProcessData();
  const navigateToTask = useNavigateToTask();
  const instanceId = useLaxInstanceId();
  const onFormSubmitValidation = useOnFormSubmitValidation();
  const updateInitialValidations = useUpdateInitialValidations();
  const setShowAllBackendErrors = Validation.useSetShowAllBackendErrors();
  const onSubmitFormValidation = useOnFormSubmitValidation();
  const applicationMetadata = useApplicationMetadata();
  const displayError = useDisplayError();
  const queryClient = useQueryClient();
  const hasPendingScans = useHasPendingScans();

  const { mutateAsync } = useMutation({
    mutationFn: async ({ action }: ProcessNextProps = {}) => {
      if (!instanceId) {
        throw new Error('Missing instance ID, cannot perform process/next');
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
            appUnlocksOnPDFFailure(applicationMetadata)
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
        navigateToTask(
          processData.ended || !processData.currentTask ? TaskKeys.ProcessEnd : processData.currentTask.elementId,
        );
      } else if (validationIssues) {
        // Set initial validation to validation issues from process/next and make all errors visible
        updateInitialValidations(validationIssues, !appSupportsIncrementalValidationFeatures(applicationMetadata));
        if (!(await onSubmitFormValidation(true))) {
          setShowAllBackendErrors !== ContextNotProvided && setShowAllBackendErrors();
        }
      }
    },
    onError: (error: HttpClientError) => {
      window.logError('Process next failed:\n', error);
      displayError(error);
    },
  });

  return useEffectEvent(async (props?: ProcessNextProps) => {
    if (hasPendingScans) {
      await reFetchInstanceData();
    }

    const hasErrors = await onFormSubmitValidation();
    if (hasErrors) {
      return;
    }
    await mutateAsync(props ?? {}).catch(() => {});
  });
}

function appUnlocksOnPDFFailure({ altinnNugetVersion }: ApplicationMetadata) {
  return !altinnNugetVersion || isAtLeastVersion({ actualVersion: altinnNugetVersion, minimumVersion: '8.1.0.115' });
}
