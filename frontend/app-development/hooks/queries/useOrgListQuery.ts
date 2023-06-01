import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { OrgsState } from 'app-shared/types/OrgsState';

export const useOrgListQuery = (): UseQueryResult<OrgsState> => {
  const { getOrgList } = useServicesContext();
  return useQuery<OrgsState>([QueryKey.OrgList], () => getOrgList());
};
