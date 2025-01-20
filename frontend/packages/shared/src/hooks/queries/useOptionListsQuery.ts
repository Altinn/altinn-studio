import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { OptionListsResponse } from 'app-shared/types/api/OptionListsResponse';

export const useOptionListsQuery = (
  org: string,
  app: string,
): UseQueryResult<OptionListsResponse> => {
  const { getOptionLists } = useServicesContext();
  return useQuery<OptionListsResponse>({
    queryKey: [QueryKey.OptionLists, org, app],
    queryFn: () => getOptionLists(org, app),
  });
};
