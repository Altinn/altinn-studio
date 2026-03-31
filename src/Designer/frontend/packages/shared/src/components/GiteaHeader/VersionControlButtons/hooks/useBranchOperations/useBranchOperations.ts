import { useState } from 'react';
import { useCreateAndCheckoutBranch } from '../useCreateAndCheckoutBranch';
import { useCheckoutWithUncommittedChangesHandling } from 'app-shared/hooks/mutations/useCheckoutWithUncommittedChangesHandling';
import { useCheckoutBranchMutation } from 'app-shared/hooks/mutations/useCheckoutBranchMutation';
import { useDiscardChangesMutation } from 'app-shared/hooks/mutations/useDiscardChangesMutation';
import { useDeleteBranchMutation } from 'app-shared/hooks/mutations/useDeleteBranchMutation';
import type { UncommittedChangesError } from 'app-shared/types/api/BranchTypes';

const DEFAULT_BRANCH = 'master';

export interface UseBranchOperationsResult {
  checkoutExistingBranch: (branchName: string) => void;
  checkoutNewBranch: (branchName: string) => void;
  discardChangesAndCheckout: (targetBranch: string) => void;
  deleteCurrentBranch: (branchName: string) => void;
  clearUncommittedChangesError: () => void;
  isLoading: boolean;
  uncommittedChangesError: UncommittedChangesError | null;
  createError: string;
}

export function useBranchOperations(org: string, app: string): UseBranchOperationsResult {
  const [uncommittedChangesError, setUncommittedChangesError] =
    useState<UncommittedChangesError | null>(null);

  const {
    createAndCheckoutBranch,
    isLoading: isLoadingCreateNewBranch,
    createError,
  } = useCreateAndCheckoutBranch(org, app, {
    onUncommittedChanges: setUncommittedChangesError,
  });

  const checkoutMutation = useCheckoutWithUncommittedChangesHandling(org, app, {
    onUncommittedChanges: setUncommittedChangesError,
  });

  const discardChangesMutation = useDiscardChangesMutation(org, app);
  const checkoutBranchMutation = useCheckoutBranchMutation(org, app);
  const deleteBranchMutation = useDeleteBranchMutation(org, app);

  const checkoutNewBranch = (branchName: string) => {
    setUncommittedChangesError(null);
    createAndCheckoutBranch(branchName);
  };

  const checkoutExistingBranch = (branchName: string) => {
    setUncommittedChangesError(null);
    checkoutMutation.mutate(branchName);
  };

  const discardChangesAndCheckout = (targetBranch: string) => {
    discardChangesMutation.mutate(undefined, {
      onSuccess: () => checkoutMutation.mutate(targetBranch),
    });
  };

  const deleteCurrentBranch = (branchName: string) => {
    discardChangesMutation.mutate(undefined, {
      onSuccess: () => {
        checkoutBranchMutation.mutate(DEFAULT_BRANCH, {
          onSuccess: () => {
            deleteBranchMutation.mutate(branchName, {
              onSuccess: () => location.reload(),
            });
          },
        });
      },
    });
  };

  const clearUncommittedChangesError = () => {
    setUncommittedChangesError(null);
  };

  const isLoading =
    isLoadingCreateNewBranch ||
    checkoutMutation.isPending ||
    discardChangesMutation.isPending ||
    checkoutBranchMutation.isPending ||
    deleteBranchMutation.isPending;

  return {
    checkoutExistingBranch,
    checkoutNewBranch,
    discardChangesAndCheckout,
    deleteCurrentBranch,
    clearUncommittedChangesError,
    uncommittedChangesError,
    createError,
    isLoading,
  };
}
