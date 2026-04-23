import { useMutation } from '@tanstack/react-query';
import { instanceDeletePath } from 'admin/features/apps/utils/apiPaths';
import axios from 'axios';

export const useInstanceDeletionMutation = (
  org: string,
  environment: string,
  app: string,
  instanceId: string,
) => {
  return useMutation({
    mutationFn: async () =>
      await axios.delete(instanceDeletePath(org, environment, app, instanceId)),
  });
};
