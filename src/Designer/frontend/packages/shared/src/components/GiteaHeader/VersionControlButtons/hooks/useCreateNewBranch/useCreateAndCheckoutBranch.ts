import { useCheckoutWithUncommittedChangesHandling } from 'app-shared/hooks/mutations/useCheckoutWithUncommittedChangesHandling';
import { useCreateBranchMutation } from 'app-shared/hooks/mutations/useCreateBranchMutation';
import { useState } from 'react';
import type { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import type { UncommittedChangesError } from 'app-shared/types/api/BranchTypes';

export interface UseCreateAndCheckoutBranchResult {
  createAndCheckoutBranch: (branchName: string) => void;
  isLoading: boolean;
  uncommittedChangesError: UncommittedChangesError | null;
  createError: string;
}

export function useCreateAndCheckoutBranch(
  org: string,
  app: string,
): UseCreateAndCheckoutBranchResult {
  const { t } = useTranslation();
  const [uncommittedChangesError, setUncommittedChangesError] =
    useState<UncommittedChangesError | null>(null);
  const [createError, setCreateError] = useState('');

  const createMutation = useCreateBranchMutation(org, app, {
    onSuccess: (_, branchName) => {
      checkoutMutation.mutate(branchName);
    },
    onError: (err: AxiosError) => {
      if (err.response?.status === 409) {
        setCreateError(t('branching.new_branch_dialog.error_already_exists'));
      } else {
        setCreateError(t('branching.new_branch_dialog.error_generic'));
      }
    },
  });

  const checkoutMutation = useCheckoutWithUncommittedChangesHandling(org, app, {
    onUncommittedChanges: (error) => {
      setUncommittedChangesError(error);
    },
    onOtherError: () => {
      setCreateError(t('branching.new_branch_dialog.error_generic'));
    },
  });

  const createAndCheckoutBranch = (branchName: string) => {
    setCreateError('');
    setUncommittedChangesError(null);
    createMutation.mutate(branchName);
  };

  return {
    createAndCheckoutBranch,
    isLoading: createMutation.isPending || checkoutMutation.isPending,
    uncommittedChangesError,
    createError,
  };
}
