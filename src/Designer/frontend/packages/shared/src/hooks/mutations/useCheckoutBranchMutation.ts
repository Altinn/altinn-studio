import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseMutationOptions, QueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { RepoStatus } from 'app-shared/types/api/BranchTypes';
import type { AxiosError } from 'axios';
import { HttpResponseUtils } from '../../utils/httpResponseUtils';
import { isAppSpecificQuery } from 'app-shared/utils/tanstackQueryUtils';
import { RoutePaths } from 'app-shared/enums/RoutePaths';

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
      handleUiRefresh(queryClient, org, app);
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

// `invalidateQueries` is set for AiAssistant only. Other pages need full reload due to stale data issues.
const handleUiRefresh = (queryClient: QueryClient, org: string, app: string) => {
  if (!isAiAssistantPath()) {
    window.location.reload();
  } else {
    queryClient.invalidateQueries({
      predicate: (query) => isAppSpecificQuery(query, org, app),
    });
  }
};

const isAiAssistantPath = (): boolean => {
  const currentPath = window.location.pathname;
  return currentPath.includes(RoutePaths.AiAssistant);
};
