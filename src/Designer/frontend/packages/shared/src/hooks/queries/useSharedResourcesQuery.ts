import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { GetSharedResourcesResponse } from '../../types/api/GetSharedResourcesResponse';

export function useSharedCodeListsQuery(
  orgName: string,
  path: string = 'CodeLists',
): UseQueryResult<GetSharedResourcesResponse> {
  const { getSharedResourcesByPath } = useServicesContext();
  return useQuery<GetSharedResourcesResponse>({
    queryKey: [QueryKey.SharedResourcesByPath, orgName, path],
    queryFn: () => getSharedResourcesByPath(orgName, path),
  });
}
