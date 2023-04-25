import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKey } from '../../../types/QueryKey';
import { useServicesContext } from '../../../common/ServiceContext';

export type CreateReleasePayload = {
  tagName: string;
  name: string;
  body: string;
  targetCommitish: string;
};

export const useCreateReleaseMutation = (owner, app) => {
  const queryClient = useQueryClient();
  const { createRelease } = useServicesContext();
  return useMutation({
    mutationFn: (payload: CreateReleasePayload) => createRelease(owner, app, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [QueryKey.AppReleases, owner, app] }),
  });
};

export type CreateDeploymentPayload = {
  envName: string;
  tagName: string;
};

export const useCreateDeployMutation = (owner, app) => {
  const queryClient = useQueryClient();
  const { createDeployment } = useServicesContext();
  return useMutation({
    mutationFn: (payload: CreateDeploymentPayload) => createDeployment(owner, app, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [QueryKey.AppDeployments, owner, app] }),
  });
};
