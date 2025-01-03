import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { OptionsListsResponse } from 'app-shared/types/api/OptionsLists';

export const useOptionListsQuery = (
  org: string,
  app: string,
): UseQueryResult<OptionsListsResponse> => {
  const { getOptionLists } = useServicesContext();
  return useQuery<OptionsListsResponse>({
    queryKey: [QueryKey.OptionLists, org, app],
    queryFn: () => getOptionLists(org, app),
  });
};
