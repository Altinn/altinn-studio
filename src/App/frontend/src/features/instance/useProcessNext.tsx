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
import { doProcessNext } from 'src/queries/queries';
import { TaskKeys } from 'src/routesBuilder';
import type { BackendValidationIssue } from 'src/features/validation';
import type { IActionType, IInstance, IProcess, ProblemDetails } from 'src/types/shared';
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
        .catch(async (error) => {
          if (error.response?.status === 409 && error.response?.data?.['validationIssues']?.length) {
            // If process next failed due to validation, return validationIssues instead of throwing
            return [null, error.response.data['validationIssues'] as BackendValidationIssue[]] as const;
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
          const processNextState = error.response?.data?.['processNextState'];
          const workflowFailure = error.response?.data?.['workflowFailure'];
          if (processNextState === 'retrying' || processNextState === 'resumeRequired' || workflowFailure) {
            await reFetchInstanceData();
            return [null, null] as const;
          }

          if (error.response?.status === 500 && error.response?.data?.['detail'] === 'Pdf generation failed') {
            // Legacy fallback: a v9 backend reports PDF service task failures with a workflowFailure
            // extension (handled above); this branch only catches older backends' bare PDF error.
            toast(<Lang id='process_error.submit_error_please_retry' />, { type: 'error', autoClose: false });
            return [null, null];
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
    onError: async (error: HttpClientError<ProblemDetails | undefined>) => {
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

// NOTE: there is deliberately no frontend mutation for `process/resume`: once the engine deems a
// failure terminal it has exhausted its retry budget, so the citizen is shown a static error page
// (see WorkflowFailed) and recovery is ops-driven - the backend endpoint stays because ops tooling
// uses it, and the recovered state surfaces when the user next refreshes the page.

export function getTargetTaskFromProcess(processData: IProcess | undefined) {
  if (!processData) {
    return undefined;
  }

  return processData.ended || !processData.currentTask ? TaskKeys.ProcessEnd : processData.currentTask.elementId;
}
