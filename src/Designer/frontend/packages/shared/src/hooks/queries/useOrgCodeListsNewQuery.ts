import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { CodeListsNewResponse } from '../../types/api/CodeListsNewResponse';

export function useOrgCodeListsNewQuery(orgName: string): UseQueryResult<CodeListsNewResponse> {
  const { getOrgCodeListsNew } = useServicesContext();
  return useQuery<CodeListsNewResponse>({
    queryKey: [QueryKey.OrgCodeListsNew, orgName],
    queryFn: () => getOrgCodeListsNew(orgName),
  });
}
