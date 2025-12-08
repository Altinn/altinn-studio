import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { SharedResourcesResponse } from '../../types/api/GetSharedResourcesResponse';
import { CODE_LIST_FOLDER } from '@studio/content-library';

export function useSharedCodeListsQuery(
  orgName: string,
  path: string = CODE_LIST_FOLDER,
): UseQueryResult<SharedResourcesResponse> {
  const { getSharedResources } = useServicesContext();
  return useQuery<SharedResourcesResponse>({
    queryKey: [QueryKey.SharedResources, orgName, path],
    queryFn: () => getSharedResources(orgName, path),
  });
}
