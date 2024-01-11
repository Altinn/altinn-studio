import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { RepositoryWithStarred } from 'dashboard/utils/repoUtils/repoUtils';

export const useStarredReposQuery = (): UseQueryResult<RepositoryWithStarred[]> => {
  const { getStarredRepos } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.StarredRepos],
    queryFn: () =>
      getStarredRepos().then((data) => data.map((repo) => ({ ...repo, hasStarred: true }))),
  });
};
