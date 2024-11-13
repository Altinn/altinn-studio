import React, { useCallback, useState } from 'react';
import { toast } from 'react-toastify';

import { useMutation } from '@tanstack/react-query';

import { useAppMutations } from 'src/core/contexts/AppQueriesProvider';
import { ContextNotProvided, createContext } from 'src/core/contexts/context';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useHasPendingAttachments } from 'src/features/attachments/hooks';
import { useLaxInstanceId, useStrictInstanceRefetch } from 'src/features/instance/InstanceContext';
import { useReFetchProcessData } from 'src/features/instance/ProcessContext';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useIsSubformPage } from 'src/features/routing/AppRoutingContext';
import { useUpdateInitialValidations } from 'src/features/validation/backendValidation/backendValidationQuery';
import { appSupportsIncrementalValidationFeatures } from 'src/features/validation/backendValidation/backendValidationUtils';
import { useOnFormSubmitValidation } from 'src/features/validation/callbacks/onFormSubmitValidation';
import { Validation } from 'src/features/validation/validationContext';
import { useNavigatePage } from 'src/hooks/useNavigatePage';
import { isAtLeastVersion } from 'src/utils/versionCompare';
import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { BackendValidationIssue } from 'src/features/validation';
import type { IActionType, IProcess } from 'src/types/shared';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

interface ProcessNextProps {
  action?: IActionType;
}

const AbortedDueToFormErrors = Symbol('AbortedDueToErrors');
const AbortedDueToFailure = Symbol('AbortedDueToFailure');

function useProcessNext() {
  const { doProcessNext } = useAppMutations();
  const reFetchInstanceData = useStrictInstanceRefetch();
  const language = useCurrentLanguage();
  const refetchProcessData = useReFetchProcessData();
  const { navigateToTask } = useNavigatePage();
  const instanceId = useLaxInstanceId();
  const onFormSubmitValidation = useOnFormSubmitValidation();
  const updateInitialValidations = useUpdateInitialValidations();
  const setShowAllBackendErrors = Validation.useSetShowAllBackendErrors();
  const onSubmitFormValidation = useOnFormSubmitValidation();
  const applicationMetadata = useApplicationMetadata();

  const utils = useMutation({
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
        navigateToTask(processData?.currentTask?.elementId);
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
    },
  });

  const mutateAsync = utils.mutateAsync;
  const nativeMutate = useCallback(
    async (props: ProcessNextProps = {}) => {
      try {
        const [result] = await mutateAsync(props);
        return result ? result : AbortedDueToFormErrors;
      } catch (_err) {
        // The error is handled above
        return AbortedDueToFailure;
      }
    },
    [mutateAsync],
  );

  const perform = useCallback(
    async (props: ProcessNextProps) => {
      const hasErrors = await onFormSubmitValidation();
      if (hasErrors) {
        return AbortedDueToFormErrors;
      }

      return await nativeMutate(props || {});
    },
    [nativeMutate, onFormSubmitValidation],
  );

  return { perform, error: utils.error };
}

function appUnlocksOnPDFFailure({ altinnNugetVersion }: ApplicationMetadata) {
  return !altinnNugetVersion || isAtLeastVersion({ actualVersion: altinnNugetVersion, minimumVersion: '8.1.0.115' });
}

interface ContextData {
  busy: boolean;
  busyWithId: string;
  canSubmit: boolean;
  attachmentsPending: boolean;
  next: (props: ProcessNextProps & { nodeId: string }) => Promise<void>;
}

const { Provider, useCtx } = createContext<ContextData | undefined>({
  name: 'ProcessNavigation',
  required: false,
  default: undefined,
});

export function ProcessNavigationProvider({ children }: React.PropsWithChildren) {
  const { perform, error } = useProcessNext();
  const [busyWithId, setBusyWithId] = useState<string>('');
  const attachmentsPending = useHasPendingAttachments();

  const next = useCallback(
    async ({ nodeId, ...rest }: ProcessNextProps & { nodeId: string }) => {
      if (busyWithId) {
        return;
      }

      setBusyWithId(nodeId);
      const result = await perform(rest);
      if (result === AbortedDueToFormErrors) {
        setBusyWithId('');
      }
    },
    [busyWithId, perform],
  );

  if (error) {
    return <DisplayError error={error} />;
  }

  return (
    <Provider
      value={{
        busy: !!busyWithId,
        busyWithId,
        canSubmit: !attachmentsPending && !busyWithId,
        attachmentsPending,
        next,
      }}
    >
      {children}
    </Provider>
  );
}

export const useProcessNavigation = () => {
  // const { isSubformPage } = useNavigationParams();
  const isSubformPage = useIsSubformPage();
  if (isSubformPage) {
    throw new Error('Cannot use process navigation in a subform');
  }

  return useCtx();
};
