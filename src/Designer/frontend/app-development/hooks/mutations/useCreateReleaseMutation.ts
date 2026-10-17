import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { CreateReleasePayload } from 'app-shared/types/api/CreateReleasePayload';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useCreateReleaseMutation = (owner, app) => {
  const queryClient = useQueryClient();
  const { createRelease } = useServicesContext();
  return useMutation({
    mutationFn: (payload: CreateReleasePayload) => createRelease(owner, app, payload),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [QueryKey.AppReleases, owner, app] }),
        // Setting the app status may add a commit to master
        queryClient.invalidateQueries({ queryKey: [QueryKey.BranchStatus, owner, app] }),
        queryClient.invalidateQueries({ queryKey: [QueryKey.RepoStatus, owner, app] }),
      ]),
  });
};
