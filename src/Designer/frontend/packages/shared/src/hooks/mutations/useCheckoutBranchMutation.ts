import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseMutationOptions } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { RepoStatus } from 'app-shared/types/api/BranchTypes';
import type { AxiosError } from 'axios';
import { HttpResponseUtils } from '../../utils/httpResponseUtils';

export const useCheckoutBranchMutation = (
  org: string,
  app: string,
  options?: UseMutationOptions<RepoStatus, AxiosError, string>,
): UseMutationResult<RepoStatus, AxiosError, string> => {
  const { checkoutBranch } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (branchName: string) => checkoutBranch(org, app, branchName),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.CurrentBranch, org, app] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.RepoStatus, org, app] });
      options?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      options?.onError?.(error, variables, context);
    },
    meta: {
      hideDefaultError: (error: AxiosError) => HttpResponseUtils.isConflict(error),
    },
  });
};
