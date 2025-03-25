import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const useGetAvailableOptionListsFromOrgQuery = (
  org: string,
): UseQueryResult<string[], Error> => {
  const { getAvailableOptionListTitlesInOrg } = useServicesContext();
  return useQuery<string[]>({
    queryKey: [QueryKey.OptionListTitles, org],
    queryFn: () => getAvailableOptionListTitlesInOrg(org),
  });
};
