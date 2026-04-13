import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { CreateBotAccountRequest } from 'app-shared/types/BotAccount';

export const useCreateBotAccountMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { createBotAccount } = useServicesContext();
  return useMutation({
    mutationFn: (payload: CreateBotAccountRequest) => createBotAccount(org, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.BotAccounts, org] });
    },
  });
};
