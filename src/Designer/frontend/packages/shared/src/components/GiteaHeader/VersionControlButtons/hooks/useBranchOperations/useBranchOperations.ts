import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCheckoutBranchMutation } from 'app-shared/hooks/mutations/useCheckoutBranchMutation';
import { useCreateBranchMutation } from 'app-shared/hooks/mutations/useCreateBranchMutation';
import { useDiscardChangesMutation } from 'app-shared/hooks/mutations/useDiscardChangesMutation';
import { HttpResponseUtils } from 'app-shared/utils/httpResponseUtils';
import type { UncommittedChangesError } from 'app-shared/types/api/BranchTypes';
import type { AxiosError } from 'axios';

export interface UseBranchOperationsResult {
  checkoutExistingBranch: (branchName: string) => void;
  checkoutNewBranch: (branchName: string) => void;
  discardChangesAndCheckout: (targetBranch: string) => void;
  clearUncommittedChangesError: () => void;
  isLoading: boolean;
  uncommittedChangesError: UncommittedChangesError | null;
  createError: string;
}

/**
 * Abstraction layer for branch mutations that are dependent on one another.
 * May be moved to backend in the future, to avoid cascading HTTP calls.
 */
export function useBranchOperations(org: string, app: string): UseBranchOperationsResult {
  const { t } = useTranslation();
  const [uncommittedChangesError, setUncommittedChangesError] =
    useState<UncommittedChangesError | null>(null);
  const [createError, setCreateError] = useState('');

  const createBranchMutation = useCreateBranchMutation(org, app);
  const checkoutBranchMutation = useCheckoutBranchMutation(org, app);
  const discardChangesMutation = useDiscardChangesMutation(org, app);

  const handleCheckoutError = (error: AxiosError<UncommittedChangesError>): void => {
    if (HttpResponseUtils.isConflict(error) && error.response?.data) {
      setUncommittedChangesError(error.response.data);
    }
  };

  const checkoutAndReload = (branchName: string): void => {
    checkoutBranchMutation.mutate(branchName, {
      onSuccess: () => location.reload(),
      onError: handleCheckoutError,
    });
  };

  const checkoutExistingBranch = (branchName: string): void => {
    setUncommittedChangesError(null);
    checkoutAndReload(branchName);
  };

  const checkoutNewBranch = (branchName: string): void => {
    setUncommittedChangesError(null);
    setCreateError('');

    createBranchMutation.mutate(branchName, {
      onSuccess: () => checkoutAndReload(branchName),
      onError: (error: AxiosError) => {
        setCreateError(
          t(
            HttpResponseUtils.isConflict(error)
              ? 'branching.new_branch_dialog.error_already_exists'
              : 'branching.new_branch_dialog.error_generic',
          ),
        );
      },
    });
  };

  const discardChangesAndCheckout = (targetBranch: string): void => {
    discardChangesMutation.mutate(undefined, {
      onSuccess: () => checkoutAndReload(targetBranch),
    });
  };

  const clearUncommittedChangesError = (): void => {
    setUncommittedChangesError(null);
  };

  const isLoading =
    createBranchMutation.isPending ||
    checkoutBranchMutation.isPending ||
    discardChangesMutation.isPending;

  return {
    checkoutExistingBranch,
    checkoutNewBranch,
    discardChangesAndCheckout,
    clearUncommittedChangesError,
    uncommittedChangesError,
    createError,
    isLoading,
  };
}
