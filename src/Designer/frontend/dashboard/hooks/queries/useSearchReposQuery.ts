import type { SearchRepoFilterParams } from 'app-shared/types/api/SearchRepoFilterParams';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { SearchRepositoryResponse } from 'app-shared/types/api/SearchRepositoryResponse';

// Long enough that a prefetched page is still fresh when the user opens it.
const SEARCH_RESULTS_STALE_TIME_MS = 60 * 1000;

export const useSearchReposQuery = (
  filter: SearchRepoFilterParams,
): UseQueryResult<SearchRepositoryResponse> => {
  const { searchRepos } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.SearchRepos, filter],
    queryFn: () => searchRepos(mapQueryParams(filter)),
    staleTime: SEARCH_RESULTS_STALE_TIME_MS,
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
  return copyParams;
};
