import type { UseQueryResult, QueryMeta } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { Org } from 'app-shared/types/OrgList';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

// TODO: Remove the one from app-development
export const useOrgListQuery = (meta?: QueryMeta): UseQueryResult<KeyValuePairs<Org>> => {
  const { getOrgList } = useServicesContext();
  return useQuery<KeyValuePairs<Org>>({
    queryKey: [QueryKey.OrgList],
    queryFn: async () => {
      const orgList = await getOrgList();
      return orgList.orgs;
    },
    meta,
  });
};
