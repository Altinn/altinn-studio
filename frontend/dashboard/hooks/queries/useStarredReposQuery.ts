import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { IRepository } from 'app-shared/types/global';

export const useStarredReposQuery = (): UseQueryResult<IRepository[]> => {
  const { getStarredRepos } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.StarredRepos],
    queryFn: () =>
      getStarredRepos().then((data) => data.map((repo) => ({ ...repo, user_has_starred: true }))),
  });
};
