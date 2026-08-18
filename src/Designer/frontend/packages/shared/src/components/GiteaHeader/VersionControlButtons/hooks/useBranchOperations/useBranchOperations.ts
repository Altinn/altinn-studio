import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCheckoutBranchMutation } from 'app-shared/hooks/mutations/useCheckoutBranchMutation';
import { useCreateAndCheckoutBranchMutation } from 'app-shared/hooks/mutations/useCreateAndCheckoutBranchMutation';
import { useDiscardAndCheckoutBranchMutation } from 'app-shared/hooks/mutations/useDiscardAndCheckoutBranchMutation';
import { useDeleteBranchMutation } from 'app-shared/hooks/mutations/useDeleteBranchMutation';
import { HttpResponseUtils } from 'app-shared/utils/httpResponseUtils';
import type { UncommittedChangesError } from 'app-shared/types/api/BranchTypes';
import type { AxiosError } from 'axios';

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
  const { t } = useTranslation();
  const [uncommittedChangesError, setUncommittedChangesError] =
    useState<UncommittedChangesError | null>(null);
  const [createError, setCreateError] = useState('');

  const checkoutBranchMutation = useCheckoutBranchMutation(org, app);
  const createAndCheckoutBranchMutation = useCreateAndCheckoutBranchMutation(org, app);
  const discardAndCheckoutBranchMutation = useDiscardAndCheckoutBranchMutation(org, app);
  const deleteBranchMutation = useDeleteBranchMutation(org, app);

  const reload = (): void => location.reload();

  const handleCheckoutError = (error: AxiosError<UncommittedChangesError>): void => {
    if (HttpResponseUtils.isConflict(error) && error.response?.data) {
      setUncommittedChangesError(error.response.data);
    }
  };

  const checkoutExistingBranch = (branchName: string): void => {
    setUncommittedChangesError(null);
    checkoutBranchMutation.mutate(branchName, {
      onSuccess: reload,
      onError: handleCheckoutError,
    });
  };

  const checkoutNewBranch = (branchName: string): void => {
    setUncommittedChangesError(null);
    setCreateError('');

    createAndCheckoutBranchMutation.mutate(branchName, {
      onSuccess: reload,
      onError: (error: AxiosError<UncommittedChangesError>) => {
        if (HttpResponseUtils.isConflict(error) && error.response?.data) {
          setUncommittedChangesError(error.response.data);
        } else {
          setCreateError(t('branching.new_branch_dialog.error_generic'));
        }
      },
    });
  };

  const discardChangesAndCheckout = (targetBranch: string): void => {
    discardAndCheckoutBranchMutation.mutate(targetBranch, {
      onSuccess: reload,
      onError: handleCheckoutError,
    });
  };

  const deleteCurrentBranch = (branchName: string): void => {
    deleteBranchMutation.mutate(branchName, {
      onSuccess: reload,
    });
  };

  const clearUncommittedChangesError = (): void => {
    setUncommittedChangesError(null);
  };

  const isLoading =
    checkoutBranchMutation.isPending ||
    createAndCheckoutBranchMutation.isPending ||
    discardAndCheckoutBranchMutation.isPending ||
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
