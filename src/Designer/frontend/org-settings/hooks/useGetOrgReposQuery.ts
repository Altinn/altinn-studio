import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { Repository } from 'app-shared/types/Repository';

export const useGetOrgReposQuery = (org: string): UseQueryResult<Repository[]> => {
  const { getOrgRepos } = useServicesContext();
  return useQuery<Repository[]>({
    queryKey: [QueryKey.OrgRepos, org],
    queryFn: () => getOrgRepos(org),
  });
};
