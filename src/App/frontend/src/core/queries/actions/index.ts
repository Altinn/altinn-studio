import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAppMutations } from 'src/core/queries/AppQueriesProvider';
import { signingQueryKeys } from 'src/core/queries/signeeList/signing.queries';
import type { UserActionRequest } from 'src/core/api-client/actions.api';

interface ServerActionInput {
  instanceOwnerPartyId: string;
  instanceGuid: string;
  language: string;
  action: UserActionRequest;
}

export function useServerActionMutation() {
  const { doPerformAction } = useAppMutations();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ instanceOwnerPartyId, instanceGuid, action, language }: ServerActionInput) => {
      const result = await doPerformAction(instanceOwnerPartyId, instanceGuid, action, language);
      if (action.action === 'sign') {
        void queryClient.invalidateQueries({ queryKey: signingQueryKeys.all });
      }
      return result;
    },
  });
  const mutateAsync: (input: ServerActionInput) => Promise<Awaited<ReturnType<typeof doPerformAction>>> =
    mutation.mutateAsync;
  return { mutateAsync };
}
