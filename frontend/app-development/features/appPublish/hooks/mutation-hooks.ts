import { useServicesContext } from '../contexts/ServiceContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CacheKey } from './query-hooks';

export type CreateRelease = {
  tagName: string;
  name: string;
  body: string;
  targetCommitish: string;
};

export const useCreateReleaseMutation = (owner, app) => {
  const queryClient = useQueryClient();
  const { createRelease } = useServicesContext();
  return useMutation({
    mutationFn: (payload: CreateRelease) => createRelease(owner, app, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [CacheKey.AppReleases, owner, app] }),
  });
};
