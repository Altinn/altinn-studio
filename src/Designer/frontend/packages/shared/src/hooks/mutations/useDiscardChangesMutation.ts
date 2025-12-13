import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseMutationOptions } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { RepoStatus } from 'app-shared/types/api/BranchTypes';
import type { AxiosError } from 'axios';

export const useDiscardChangesMutation = (
  org: string,
  app: string,
  options?: UseMutationOptions<RepoStatus, AxiosError, void>,
): UseMutationResult<RepoStatus, AxiosError, void> => {
  const { discardChanges } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => discardChanges(org, app),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.RepoStatus, org, app] });
      options?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      options?.onError?.(error, variables, context);
    },
  });
};
