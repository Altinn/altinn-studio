import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseMutationOptions } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { RepoStatus } from 'app-shared/types/api/BranchTypes';
import type { AxiosError } from 'axios';
import { HttpResponseUtils } from '../../utils/httpResponseUtils';
import { isAppSpecificQuery, isFormLayoutQuery } from 'app-shared/utils/tanstackQueryUtils';

export const useCheckoutBranchMutation = (
  org: string,
  app: string,
  options?: UseMutationOptions<RepoStatus, AxiosError, string>,
): UseMutationResult<RepoStatus, AxiosError, string> => {
  const { checkoutBranch } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (branchName: string) => checkoutBranch(org, app, branchName),
    onSuccess: (data, variables, onMutateResult, context) => {
      // To prevent race conditions, refetch is temporarily disabled for form layout queries.
      // They will be refetched once the component tree updates after checkout.
      queryClient.invalidateQueries({
        predicate: isFormLayoutQuery,
        refetchType: 'none',
      });
      queryClient.invalidateQueries({
        predicate: (query) => isAppSpecificQuery(query, org, app) && !isFormLayoutQuery(query),
      });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      options?.onError?.(error, variables, onMutateResult, context);
    },
    meta: {
      hideDefaultError: (error: AxiosError) => HttpResponseUtils.isConflict(error),
    },
  });
};
