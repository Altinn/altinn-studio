import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { LibraryResourceType } from 'app-shared/enums/LibraryResourceType';

export const useGetAvailableCodeListsFromOrgQuery = (
  org: string,
  resourceType: LibraryResourceType,
): UseQueryResult<string[], Error> => {
  const { getAvailableResourcesFromOrg } = useServicesContext();
  return useQuery<string[]>({
    queryKey: [QueryKey.CodeListTitles, org],
    queryFn: () => getAvailableResourcesFromOrg(org, resourceType),
  });
};
