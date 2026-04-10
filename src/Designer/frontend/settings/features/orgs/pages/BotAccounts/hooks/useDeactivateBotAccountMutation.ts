import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useDeactivateBotAccountMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { deactivateBotAccount } = useServicesContext();
  return useMutation({
    mutationFn: (botAccountId: string) => deactivateBotAccount(org, botAccountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.BotAccounts, org] });
    },
  });
};
