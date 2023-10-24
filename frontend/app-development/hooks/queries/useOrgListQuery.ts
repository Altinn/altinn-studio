import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { OrgsState } from 'app-shared/types/OrgsState';
import { QueryMeta } from '@tanstack/react-query/build/lib';

export const useOrgListQuery = (meta?: QueryMeta): UseQueryResult<OrgsState> => {
  const { getOrgList } = useServicesContext();
  return useQuery<OrgsState>([QueryKey.OrgList], () => getOrgList(), { meta });
};
