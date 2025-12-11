import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { useAppMutations } from 'src/core/contexts/AppQueriesProvider';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';

export const usePerformPayActionMutation = (partyId?: string, instanceGuid?: string) => {
  const queryClient = useQueryClient();
  const { doPerformAction } = useAppMutations();
  const selectedLanguage = useCurrentLanguage();
  return useMutation({
    mutationKey: ['performPayAction', partyId, instanceGuid],
    mutationFn: async () => {
      if (partyId && instanceGuid) {
        return await doPerformAction(partyId, instanceGuid, { action: 'pay' }, selectedLanguage, queryClient);
      }
    },
    onError: (error: AxiosError) => {
      window.logError('Error performing pay action', error);
      if (error.response?.status === 409) {
        // The payment has already been paid, reload the page to get the updated status and go to receipt
        window.location.reload();
      }
    },
    onSuccess: (data) => {
      if (data?.redirectUrl) {
        window.location.assign(data.redirectUrl);
      } else {
        return queryClient.invalidateQueries({ queryKey: ['fetchPaymentInfo'] });
      }
    },
  });
};
