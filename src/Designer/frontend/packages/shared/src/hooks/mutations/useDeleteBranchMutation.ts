import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseMutationOptions } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AxiosError } from 'axios';

export const useDeleteBranchMutation = (
  org: string,
  app: string,
  options?: UseMutationOptions<void, AxiosError, string>,
): UseMutationResult<void, AxiosError, string> => {
  const { deleteBranch } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (branchName: string) => deleteBranch(org, app, branchName),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.Branches, org, app] });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      options?.onError?.(error, variables, onMutateResult, context);
    },
  });
};
