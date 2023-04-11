import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IRepository } from 'app-shared/types/global';
import { useServicesContext } from 'dashboard/contexts/servicesContext';
import { AddRepo, Filters } from 'dashboard/services/repoService';

enum ServerStateCacheKey {
  SearchRepos = 'GET_ORGANIZATIONS',
  StarredRepos = 'GET_STARRED_REPOS',
}

export const useAddRepoMutation = () => {
  const { repoService } = useServicesContext();
  return useMutation((repoToAdd: AddRepo) => repoService.addRepo(repoToAdd));
};

export const useSearchReposQuery = (filter: Filters) => {
  const { repoService } = useServicesContext();

  return useQuery([ServerStateCacheKey.SearchRepos, filter], () =>
    repoService.searchRepos(mapQueryParams(filter))
  );
};

export const useGetStarredRepos = () => {
  const { repoService } = useServicesContext();

  const queryResult = useQuery([ServerStateCacheKey.StarredRepos], () =>
    repoService.getStarredRepos()
  );
  return {
    ...queryResult,
    data: queryResult.data?.map((repo) => ({ ...repo, user_has_starred: true })),
  };
};

export const useSetStarredRepo = () => {
  const { repoService } = useServicesContext();

  const queryClient = useQueryClient();
  return useMutation((repo: IRepository) => repoService.setStarredRepo(repo), {
    onSuccess: () => {
      queryClient.invalidateQueries([ServerStateCacheKey.StarredRepos]);
    },
  });
};

export const useUnsetStarredRepo = () => {
  const { repoService } = useServicesContext();

  const queryClient = useQueryClient();
  return useMutation((repo: IRepository) => repoService.unsetStarredRepo(repo), {
    onSuccess: () => {
      queryClient.invalidateQueries([ServerStateCacheKey.StarredRepos]);
    },
  });
};

export const useCopyAppMutation = () => {
  const { repoService } = useServicesContext();

  return useMutation(({ org, app, repoName }: { org: string; app: string; repoName: string }) =>
    repoService.copyApp(org, app, repoName)
  );
};

const mapQueryParams = (params: Filters): Filters => {
  const copyParams = { ...params };
  if (params.sortby === 'name') {
    copyParams.sortby = 'alpha';
  }

  if (params.sortby === 'updated_at') {
    copyParams.sortby = 'updated';
  }

  copyParams.page = params.page + 1;

  return copyParams;
};
