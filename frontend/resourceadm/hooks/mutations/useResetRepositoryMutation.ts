import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Resets the respository by removing all current local changes
 *
 * @param owner the owner of the app
 * @param app the app to reset
 */
export const useResetRepositoryMutation = (owner: string, app: string) => {
  const queryClient = useQueryClient();
  const { resetRepoChanges } = useServicesContext();
  return useMutation({
    mutationFn: () => resetRepoChanges(owner, app),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.RepoStatus, owner, app] });
    },
  });
};
