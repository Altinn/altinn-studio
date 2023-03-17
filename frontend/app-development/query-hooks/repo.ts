import { useMutation, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from '../common/ServiceContext';
import { CacheKey } from 'app-shared/api-paths/cache-key';
import { IRepository } from '../types/global';
import { RepoStatus } from '../features/appPublish/hooks/query-hooks';

export const useRepoMetadata = (owner, app): UseQueryResult<IRepository> => {
  const { getRepoMetadata } = useServicesContext();
  return useQuery<IRepository>([CacheKey.RepoMetaData, owner, app], () =>
    getRepoMetadata(owner, app)
  );
};

export const useRepoPullData = (owner, app, disabled?): UseQueryResult<RepoStatus> => {
  const { getRepoPull } = useServicesContext();
  return useQuery<RepoStatus>([CacheKey.RepoPullData, owner, app], () => getRepoPull(owner, app), {
    enabled: !disabled,
  });
};

export const useRepoPushMutation = (owner, app) => {
  const q = useQueryClient();
  const { pushRepoChanges } = useServicesContext();
  return useMutation({
    mutationFn: () => pushRepoChanges(owner, app),
    onSuccess: () => {
      q.invalidateQueries({ queryKey: [CacheKey.RepoStatus, owner, app] }).then();
      q.invalidateQueries({ queryKey: [CacheKey.BranchStatus, owner, app, 'master'] }).then();
    },
  });
};

export const useCreateRepoCommitMutation = (owner, app) => {
  const q = useQueryClient();
  const { createRepoCommit } = useServicesContext();
  return useMutation({
    mutationFn: ({ commitMessage }: { commitMessage: string }) =>
      createRepoCommit(owner, app, {
        message: commitMessage,
        org: owner,
        repository: app,
      }),
    onSuccess: () => q.invalidateQueries({ queryKey: [CacheKey.RepoPullData, owner, app] }),
  });
};
