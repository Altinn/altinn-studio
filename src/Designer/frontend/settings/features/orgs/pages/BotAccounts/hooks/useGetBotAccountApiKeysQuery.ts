import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useGetBotAccountApiKeysQuery = (org: string, botAccountId: string) => {
  const { getBotAccountApiKeys } = useServicesContext();

  return useQuery({
    queryKey: [QueryKey.BotAccountApiKeys, org, botAccountId],
    queryFn: () => getBotAccountApiKeys(org, botAccountId),
    enabled: !!botAccountId,
  });
};
