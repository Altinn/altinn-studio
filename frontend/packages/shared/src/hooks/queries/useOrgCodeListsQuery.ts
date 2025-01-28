import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { OptionListsResponse } from 'app-shared/types/api/OptionListsResponse';

export const useOrgCodeListsQuery = (org: string): UseQueryResult<OptionListsResponse> => {
  const { getCodeListsForOrg } = useServicesContext();
  return useQuery<OptionListsResponse>({
    queryKey: [QueryKey.OrgCodeLists, org],
    queryFn: () => getCodeListsForOrg(org),
  });
};
