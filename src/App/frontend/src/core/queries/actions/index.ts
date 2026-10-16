import { useParams } from 'react-router';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type * as CBTypes from '@app/layout-contract/generated/components/CustomButton/config.generated';

import { useAppMutations } from 'src/core/queries/QueryProvider';
import { signingQueryKeys } from 'src/core/queries/signeeList/signing.queries';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import type { FormStore } from 'src/features/form/FormContext';
import type { ActionResult, UseHandleClientActions } from 'src/layout/CustomButton/CustomButtonComponent';

type FormDataLocking = ReturnType<typeof FormStore.data.useLocking>;

type PerformActionMutationProps = {
  action: CBTypes.CustomAction;
  buttonId: string;
};

export function useServerActionMutation(
  acquireLock: FormDataLocking,
  { handleClientActions, handleDataModelUpdate }: UseHandleClientActions,
) {
  const { instanceOwnerPartyId, instanceGuid } = useParams();
  const selectedLanguage = useCurrentLanguage();
  const queryClient = useQueryClient();
  const { doPerformAction } = useAppMutations();

  const mutation = useMutation({
    mutationFn: async ({ action, buttonId }: PerformActionMutationProps) => {
      const lock = await acquireLock();
      if (!instanceGuid || !instanceOwnerPartyId) {
        throw Error('Cannot perform action without partyId and instanceGuid');
      }

      try {
        const result = await doPerformAction(
          instanceOwnerPartyId,
          instanceGuid,
          { action: action.id, buttonId },
          selectedLanguage,
        );

        if (action.id === 'sign') {
          void queryClient.invalidateQueries({ queryKey: signingQueryKeys.all });
        }
        await handleDataModelUpdate(lock, result);
        if (result.clientActions) {
          await handleClientActions(result.clientActions);
        }

        return result;
      } catch (error) {
        if (lock.isLocked()) {
          lock.unlock();
        }
        throw error;
      }
    },
  });
  const mutateAsync: (variables: PerformActionMutationProps) => Promise<ActionResult> = mutation.mutateAsync;
  return {
    mutateAsync,
    error: mutation.error,
  };
}
