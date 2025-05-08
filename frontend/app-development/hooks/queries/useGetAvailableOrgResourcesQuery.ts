import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { LibraryContentType } from 'app-shared/enums/LibraryContentType';
import type { ExternalResource } from 'app-shared/types/ExternalResource';

export const useGetAvailableOrgResourcesQuery = (
  org: string,
  contentType?: LibraryContentType,
): UseQueryResult<ExternalResource[], Error> => {
  const { getAvailableResourcesFromOrg } = useServicesContext();
  return useQuery<ExternalResource[]>({
    queryKey: [QueryKey.AvailableOrgResources, org],
    queryFn: () => getAvailableResourcesFromOrg(org, contentType),
  });
};
