import { useServicesContext } from '../contexts/ServiceContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CacheKey } from './query-hooks';
import { ICreateAppDeploymentEnvObject } from '../../../sharedResources/appDeployment/types';

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
      queryClient.invalidateQueries({ queryKey: [CacheKey.AppReleases, owner, app] }),
  });
};

export type CreateDeploymentPayload = {
  env: ICreateAppDeploymentEnvObject;
  tagName: string;
};

export const useCreateDeployMutation = (owner, app) => {
  const queryClient = useQueryClient();
  const { createDeployment } = useServicesContext();
  return useMutation({
    mutationFn: (payload: CreateDeploymentPayload) => createDeployment(owner, app, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [CacheKey.AppDeployments, owner, app] }),
  });
};
