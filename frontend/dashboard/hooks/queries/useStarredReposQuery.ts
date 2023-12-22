import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { Repository } from 'app-shared/types/Repository';

export const useStarredReposQuery = (): UseQueryResult<Repository[]> => {
  const { getStarredRepos } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.StarredRepos],
    queryFn: () => getStarredRepos(),
  });
};
