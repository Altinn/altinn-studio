import React, { useCallback, useState } from 'react';

import { useMutation } from '@tanstack/react-query';

import { useAppMutations } from 'src/core/contexts/AppQueriesProvider';
import { ContextNotProvided, createContext } from 'src/core/contexts/context';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { useHasPendingAttachments } from 'src/features/attachments/hooks';
import { useLaxInstance, useStrictInstance } from 'src/features/instance/InstanceContext';
import { useLaxProcessData, useSetProcessData } from 'src/features/instance/ProcessContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { mapValidationIssueToFieldValidation } from 'src/features/validation/backendValidation/backendValidationUtils';
import { useOnFormSubmitValidation } from 'src/features/validation/callbacks/onFormSubmitValidation';
import { Validation } from 'src/features/validation/validationContext';
import { useNavigatePage } from 'src/hooks/useNavigatePage';
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
  const { reFetch: reFetchInstanceData } = useStrictInstance();
  const language = useCurrentLanguage();
  const setProcessData = useSetProcessData();
  const currentProcessData = useLaxProcessData();
  const { navigateToTask } = useNavigatePage();
  const instanceId = useLaxInstance()?.instanceId;
  const onFormSubmitValidation = useOnFormSubmitValidation();
  const updateTaskValidations = Validation.useUpdateTaskValidations();

  const utils = useMutation({
    mutationFn: async ({ action }: ProcessNextProps = {}) => {
      if (!instanceId) {
        throw new Error('Missing instance ID, cannot perform process/next');
      }
      return doProcessNext(instanceId, language, action)
        .then((process) => [process as IProcess, null] as const)
        .catch((error) => {
          // If process next failed due to validation, return validationIssues instead of throwing
          if (error.response?.status === 409 && error.response?.data?.['validationIssues']?.length) {
            if (updateTaskValidations === ContextNotProvided) {
              window.logError(
                "PUT 'process/next' returned validation issues, but there is no ValidationProvider available.",
              );
              throw error;
            }

            // Return validation issues
            return [null, error.response.data['validationIssues'] as BackendValidationIssue[]] as const;
          } else {
            throw error;
          }
        });
    },
    onSuccess: async ([processData, validationIssues]) => {
      if (processData) {
        await reFetchInstanceData();
        setProcessData?.({ ...processData, processTasks: currentProcessData?.processTasks });
        navigateToTask(processData?.currentTask?.elementId);
      } else if (validationIssues && updateTaskValidations !== ContextNotProvided) {
        updateTaskValidations(validationIssues.map(mapValidationIssueToFieldValidation));
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

export const useProcessNavigation = () => useCtx();
