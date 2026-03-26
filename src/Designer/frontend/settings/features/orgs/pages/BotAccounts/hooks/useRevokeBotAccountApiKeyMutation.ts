import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useRevokeBotAccountApiKeyMutation = (org: string, botAccountId: string) => {
  const queryClient = useQueryClient();
  const { revokeBotAccountApiKey } = useServicesContext();
  return useMutation({
    mutationFn: (keyId: number) => revokeBotAccountApiKey(org, botAccountId, keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.BotAccountApiKeys, org, botAccountId] });
    },
  });
};
