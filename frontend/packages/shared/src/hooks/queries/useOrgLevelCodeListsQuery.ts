import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { CodeList } from '@studio/components';

export const useOrgLevelCodeListsQuery = () => {
  const { getOrgLevelCodeLists } = useServicesContext();
  return useQuery<CodeList[]>({
    queryKey: [QueryKey.OrgLevelCodeLists],
    queryFn: () => getOrgLevelCodeLists(),
  });
};
