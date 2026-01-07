import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useCheckoutBranchMutation } from './useCheckoutBranchMutation';
import type { RepoStatus, UncommittedChangesError } from '../../types/api/BranchTypes';
import { HttpResponseUtils } from '../../utils/httpResponseUtils';

interface UseCheckoutWithUncommittedChangesOptions {
  onUncommittedChanges: (error: UncommittedChangesError) => void;
  onSuccess?: () => void;
  onOtherError?: (error: AxiosError) => void;
}

export const useCheckoutWithUncommittedChangesHandling = (
  org: string,
  app: string,
  options: UseCheckoutWithUncommittedChangesOptions,
): UseMutationResult<RepoStatus, AxiosError, string> => {
  const { onUncommittedChanges, onSuccess, onOtherError } = options;

  return useCheckoutBranchMutation(org, app, {
    onSuccess: () => {
      onSuccess?.();
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
