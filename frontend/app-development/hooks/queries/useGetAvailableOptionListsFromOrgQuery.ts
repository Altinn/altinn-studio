import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { OptionListData } from 'app-shared/types/OptionList';

export const useGetAvailableOptionListsFromOrgQuery = (
  org: string,
): UseQueryResult<string[], Error> => {
  const { getAvailableOptionListDataListsInOrg } = useServicesContext();
  return useQuery<string[]>({
    queryKey: [QueryKey.OptionLists, org],
    queryFn: () => getAvailableOptionListDataListsInOrg(org),
  });
};
