import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useCheckoutBranchMutation } from './useCheckoutBranchMutation';
import type { UncommittedChangesError } from '../../types/api/BranchTypes';
import type { RepoStatus } from 'app-shared/types/RepoStatus';
import { HttpResponseUtils } from '../../utils/httpResponseUtils';

interface UseCheckoutWithUncommittedChangesOptions {
  onUncommittedChanges: (error: UncommittedChangesError) => void;
  onOtherError?: (error: AxiosError) => void;
}

export const useCheckoutWithUncommittedChangesHandling = (
  org: string,
  app: string,
  options: UseCheckoutWithUncommittedChangesOptions,
): UseMutationResult<RepoStatus, AxiosError, string> => {
  const { onUncommittedChanges, onOtherError } = options;

  return useCheckoutBranchMutation(org, app, {
    onSuccess: async () => {
      location.reload();
    },
    onError: (error: AxiosError<UncommittedChangesError>) => {
      if (HttpResponseUtils.isConflict(error) && error.response?.data) {
        onUncommittedChanges(error.response.data);
      } else {
        onOtherError?.(error);
      }
    },
    retry: false,
  } as UseMutationOptions<RepoStatus, AxiosError, string>);
};
