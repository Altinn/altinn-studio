import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { CodeListsResponse } from '../../types/api/CodeListsResponse';

export const useOrgCodeListsQuery = (org: string): UseQueryResult<CodeListsResponse> => {
  const { getOrgCodeLists } = useServicesContext();
  return useQuery<CodeListsResponse>({
    queryKey: [QueryKey.OrgCodeLists, org],
    queryFn: () => getOrgCodeLists(org),
  });
};
