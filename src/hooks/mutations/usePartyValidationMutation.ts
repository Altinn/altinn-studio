import { useMutation } from '@tanstack/react-query';

import { useAppQueriesContext } from 'src/contexts/appQueriesContext';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

export const usePartyValidationMutation = () => {
  const { doPartyValidation } = useAppQueriesContext();
  return useMutation((partyId: string) => doPartyValidation(partyId).then((response) => response.data), {
    onError: (error: HttpClientError) => {
      console.warn(error);
      throw new Error('Server did not respond with party validation');
    },
  });
};
