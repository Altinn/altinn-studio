import { useMutation } from '@tanstack/react-query';

import { useAppMutations } from 'src/contexts/appQueriesContext';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

export const usePartyValidationMutation = () => {
  const { doPartyValidation } = useAppMutations();
  return useMutation((partyId: string) => doPartyValidation.call(partyId), {
    onSuccess: (data) => {
      doPartyValidation.setLastResult(data);
    },
    onError: (error: HttpClientError) => {
      console.warn(error);
      throw new Error('Server did not respond with party validation');
    },
  });
};
