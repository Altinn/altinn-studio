import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseMutationOptions } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { Branch } from 'app-shared/types/api/BranchTypes';
import type { AxiosError } from 'axios';

export const useCreateBranchMutation = (
  org: string,
  app: string,
  options?: UseMutationOptions<Branch, AxiosError, string>,
): UseMutationResult<Branch, AxiosError, string> => {
  const { createBranch } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (branchName: string) => createBranch(org, app, branchName),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.Branches, org, app] });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      options?.onError?.(error, variables, onMutateResult, context);
    },
  });
};
