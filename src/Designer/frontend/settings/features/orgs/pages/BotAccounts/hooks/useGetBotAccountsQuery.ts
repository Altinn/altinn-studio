import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useGetBotAccountsQuery = (org: string) => {
  const { getBotAccounts } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.BotAccounts, org],
    queryFn: () => getBotAccounts(org),
  });
};
