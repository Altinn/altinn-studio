import { useCheckoutWithUncommittedChangesHandling } from 'app-shared/hooks/mutations/useCheckoutWithUncommittedChangesHandling';
import { useState } from 'react';
import type { UncommittedChangesError } from 'app-shared/types/api/BranchTypes';

export interface UseCheckoutBranchAndReloadResult {
  checkoutBranchAndReload: (branchName: string) => void;
  isLoading: boolean;
  uncommittedChangesError: UncommittedChangesError | null;
}

export function useCheckoutBranchAndReload(
  org: string,
  app: string,
): UseCheckoutBranchAndReloadResult {
  const [uncommittedChangesError, setUncommittedChangesError] =
    useState<UncommittedChangesError | null>(null);

  const checkoutMutation = useCheckoutWithUncommittedChangesHandling(org, app, {
    onUncommittedChanges: (error) => {
      setUncommittedChangesError(error);
    },
    onSuccess: async () => location.reload(),
  });

  const checkoutBranchAndReload = (branchName: string) => {
    setUncommittedChangesError(null);
    checkoutMutation.mutate(branchName);
  };

  return {
    checkoutBranchAndReload,
    isLoading: checkoutMutation.isPending,
    uncommittedChangesError,
  };
}
