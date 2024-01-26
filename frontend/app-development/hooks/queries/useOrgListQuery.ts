import type { UseQueryResult, QueryMeta } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { OrgsState } from 'app-shared/types/OrgsState';

export const useOrgListQuery = (meta?: QueryMeta): UseQueryResult<OrgsState> => {
  const { getOrgList } = useServicesContext();
  return useQuery<OrgsState>({ queryKey: [QueryKey.OrgList], queryFn: () => getOrgList(), meta });
};
