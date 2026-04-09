import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { BotAccount } from 'app-shared/types/BotAccount';

export const useRevokeBotAccountApiKeyMutation = (org: string, botAccountId: string) => {
  const queryClient = useQueryClient();
  const { revokeBotAccountApiKey } = useServicesContext();
  return useMutation({
    mutationFn: (keyId: number) => revokeBotAccountApiKey(org, botAccountId, keyId),
    onSuccess: () => {
      // Decrement apiKeyCount in cached bot accounts
      queryClient.setQueryData(
        [QueryKey.BotAccounts, org],
        (prevBotAccounts: BotAccount[] | undefined) => {
          if (!prevBotAccounts) return prevBotAccounts;
          return prevBotAccounts.map((ba) =>
            ba.id === botAccountId ? { ...ba, apiKeyCount: Math.max(0, ba.apiKeyCount - 1) } : ba,
          );
        },
      );
      queryClient.invalidateQueries({ queryKey: [QueryKey.BotAccountApiKeys, org, botAccountId] });
    },
  });
};
