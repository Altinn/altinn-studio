import { MutationMeta, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { CreateDeploymentPayload } from 'app-shared/types/api/CreateDeploymentPayload';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useCreateDeploymentMutation = (owner, app, meta?: MutationMeta) => {
  const queryClient = useQueryClient();
  const { createDeployment } = useServicesContext();
  return useMutation({
    mutationFn: (payload: CreateDeploymentPayload) => createDeployment(owner, app, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [QueryKey.AppDeployments, owner, app] }),
      meta,
  });
};
