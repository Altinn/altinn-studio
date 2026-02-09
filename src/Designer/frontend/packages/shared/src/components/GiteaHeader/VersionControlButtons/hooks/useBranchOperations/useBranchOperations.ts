import { useState } from 'react';
import { useCreateAndCheckoutBranch } from '../useCreateAndCheckoutBranch';
import { useCheckoutWithUncommittedChangesHandling } from 'app-shared/hooks/mutations/useCheckoutWithUncommittedChangesHandling';
import { useDiscardChangesMutation } from 'app-shared/hooks/mutations/useDiscardChangesMutation';
import type { UncommittedChangesError } from 'app-shared/types/api/BranchTypes';

export interface UseBranchOperationsResult {
  checkoutExistingBranch: (branchName: string) => void;
  checkoutNewBranch: (branchName: string) => void;
  discardChangesAndCheckout: (targetBranch: string) => void;
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

  const clearUncommittedChangesError = () => {
    setUncommittedChangesError(null);
  };

  const isLoading =
    isLoadingCreateNewBranch || checkoutMutation.isPending || discardChangesMutation.isPending;

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
