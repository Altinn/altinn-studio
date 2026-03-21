import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useGetOrgReposQuery = (org: string) => {
  const { getOrgRepos } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.OrgRepos, org],
    queryFn: () => getOrgRepos(org),
  });
};
