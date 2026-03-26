import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { CreateBotAccountApiKeyRequest } from 'app-shared/types/BotAccount';

export const useCreateBotAccountApiKeyMutation = (org: string, botAccountId: string) => {
  const queryClient = useQueryClient();
  const { createBotAccountApiKey } = useServicesContext();
  return useMutation({
    mutationFn: (payload: CreateBotAccountApiKeyRequest) =>
      createBotAccountApiKey(org, botAccountId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.BotAccountApiKeys, org, botAccountId] });
    },
  });
};
