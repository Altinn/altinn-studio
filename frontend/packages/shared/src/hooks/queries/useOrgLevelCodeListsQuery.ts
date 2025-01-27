import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { OptionListsResponse } from 'app-shared/types/api/OptionListsResponse';

export const useOrgLevelCodeListsQuery = () => {
  const { getOrgLevelCodeLists } = useServicesContext();
  return useQuery<OptionListsResponse[]>({
    queryKey: [QueryKey.OrgLevelCodeLists],
    queryFn: () => getOrgLevelCodeLists(),
  });
};
