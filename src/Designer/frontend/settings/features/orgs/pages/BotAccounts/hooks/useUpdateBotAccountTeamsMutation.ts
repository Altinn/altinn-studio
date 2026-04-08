import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useUpdateBotAccountMutation = (org: string, botAccountId: string) => {
  const { updateBotAccount } = useServicesContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deployEnvironments: string[]) =>
      updateBotAccount(org, botAccountId, deployEnvironments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.BotAccounts, org] });
    },
  });
};
