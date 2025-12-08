import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { GetSharedResourcesResponse } from '../../types/api/GetSharedResourcesResponse';
import { CODE_LIST_FOLDER } from '@studio/content-library';

export function useSharedCodeListsQuery(
  orgName: string,
  path: string = CODE_LIST_FOLDER,
): UseQueryResult<GetSharedResourcesResponse> {
  const { getSharedResourcesByPath } = useServicesContext();
  return useQuery<GetSharedResourcesResponse>({
    queryKey: [QueryKey.GetSharedResourcesByPath, orgName, path],
    queryFn: () => getSharedResourcesByPath(orgName, path),
  });
}
