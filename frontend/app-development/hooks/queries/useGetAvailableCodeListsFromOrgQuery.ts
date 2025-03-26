import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const useGetAvailableCodeListsFromOrgQuery = (
  org: string,
): UseQueryResult<string[], Error> => {
  const { getAvailableCodeListTitlesInOrg } = useServicesContext();
  return useQuery<string[]>({
    queryKey: [QueryKey.CodeListTitles, org],
    queryFn: () => getAvailableCodeListTitlesInOrg(org),
  });
};
