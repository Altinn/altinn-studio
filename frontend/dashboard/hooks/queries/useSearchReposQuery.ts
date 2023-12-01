import { SearchRepoFilterParams } from 'app-shared/types/api/SearchRepoFilterParams';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { SearchRepositoryResponse } from 'app-shared/types/api/SearchRepositoryResponse';

export const useSearchReposQuery = (
  filter: SearchRepoFilterParams,
): UseQueryResult<SearchRepositoryResponse> => {
  const { searchRepos } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.SearchRepos, filter],
    queryFn: () => searchRepos(mapQueryParams(filter)),
  });
};

const mapQueryParams = (params: SearchRepoFilterParams): SearchRepoFilterParams => {
  const copyParams = { ...params };
  switch (params.sortby) {
    case 'name':
      copyParams.sortby = 'alpha';
      break;
    case 'updated_at':
      copyParams.sortby = 'updated';
      break;
  }
  copyParams.page = params.page + 1;
  return copyParams;
};
