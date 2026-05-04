import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseMutationOptions } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { RepoStatus } from 'app-shared/types/api/BranchTypes';
import type { AxiosError } from 'axios';
import { HttpResponseUtils } from '../../utils/httpResponseUtils';
import { isAppSpecificQuery } from 'app-shared/utils/tanstackQueryUtils';

export const useCheckoutBranchMutation = (
  org: string,
  app: string,
  options?: UseMutationOptions<RepoStatus, AxiosError, string>,
): UseMutationResult<RepoStatus, AxiosError, string> => {
  const { checkoutBranch } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (branchName: string) => checkoutBranch(org, app, branchName),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({
        predicate: (query) => isAppSpecificQuery(query, org, app),
      });
      options?.onSuccess?.(...args);
    },
    meta: {
      hideDefaultError: (error: AxiosError) => HttpResponseUtils.isConflict(error),
      ...options?.meta,
    },
  });
};
