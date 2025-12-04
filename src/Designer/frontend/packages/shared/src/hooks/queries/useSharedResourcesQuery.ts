import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { GetSharedResourcesResponse } from '../../types/api/GetSharedResourcesResponse';

const CodeListPath = 'CodeLists';

export function useSharedCodeListsQuery(
  orgName: string,
  path: string = CodeListPath,
): UseQueryResult<GetSharedResourcesResponse> {
  const { getSharedResourcesByPath } = useServicesContext();
  return useQuery<GetSharedResourcesResponse>({
    queryKey: [QueryKey.SharedResourcesByPath, orgName, path],
    queryFn: () => getSharedResourcesByPath(orgName, path),
  });
}
