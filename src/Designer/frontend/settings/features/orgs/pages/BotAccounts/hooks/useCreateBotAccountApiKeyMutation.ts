import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type {
  CreateBotAccountApiKeyRequest,
  CreateBotAccountApiKeyResponse,
  BotAccount,
} from 'app-shared/types/BotAccount';
import type { AxiosError } from 'axios';
import type { ApiError } from 'app-shared/types/api/ApiError';

export const useCreateBotAccountApiKeyMutation = (org: string, botAccountId: string) => {
  const queryClient = useQueryClient();
  const { createBotAccountApiKey } = useServicesContext();
  return useMutation<
    CreateBotAccountApiKeyResponse,
    AxiosError<ApiError>,
    CreateBotAccountApiKeyRequest
  >({
    mutationFn: (payload) => createBotAccountApiKey(org, botAccountId, payload),
    onSuccess: () => {
      // Increment apiKeyCount in cached bot accounts
      queryClient.setQueryData(
        [QueryKey.BotAccounts, org],
        (prevBotAccounts: BotAccount[] | undefined) => {
          if (!prevBotAccounts) return prevBotAccounts;
          return prevBotAccounts.map((ba) =>
            ba.id === botAccountId ? { ...ba, apiKeyCount: ba.apiKeyCount + 1 } : ba,
          );
        },
      );
      queryClient.invalidateQueries({ queryKey: [QueryKey.BotAccountApiKeys, org, botAccountId] });
    },
  });
};
