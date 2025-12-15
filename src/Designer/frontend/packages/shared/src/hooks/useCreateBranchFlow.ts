import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { AxiosError } from 'axios';
import { useCreateBranchMutation } from './mutations/useCreateBranchMutation';
import { useCheckoutWithUncommittedChangesHandling } from './mutations/useCheckoutWithUncommittedChangesHandling';
import type { UncommittedChangesError } from '../types/api/BranchTypes';
import { BranchNameValidator } from '../utils/BranchNameValidator';

interface UseCreateBranchFlowOptions {
  org: string;
  app: string;
  onSuccess: () => void;
}

interface UseCreateBranchFlowResult {
  branchName: string;
  setBranchName: (name: string) => void;
  error: string | null;
  uncommittedChangesError: UncommittedChangesError | null;
  targetBranch: string;
  isCreatingOrCheckingOut: boolean;
  cannotCreateBranch: boolean;
  createButtonText: string;
  handleCreate: () => void;
  handleCloseUncommittedChangesDialog: () => void;
}

export const useCreateBranchFlow = ({
  org,
  app,
  onSuccess,
}: UseCreateBranchFlowOptions): UseCreateBranchFlowResult => {
  const { t } = useTranslation();

  const [branchName, setBranchName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uncommittedChangesError, setUncommittedChangesError] =
    useState<UncommittedChangesError | null>(null);
  const targetBranchRef = useRef<string>('');

  const resetAndClose = () => {
    setBranchName('');
    setError(null);
    setUncommittedChangesError(null);
    onSuccess();
  };

  const handleCloseUncommittedChangesDialog = () => {
    setUncommittedChangesError(null);
    resetAndClose();
  };

  const createMutation = useCreateBranchMutation(org, app, {
    onSuccess: () => {
      targetBranchRef.current = branchName;
      checkoutMutation.mutate(branchName);
    },
    onError: (err: AxiosError) => {
      if (err.response?.status === 409) {
        setError(t('branching.new_branch_dialog.error_already_exists'));
      } else {
        setError(t('branching.new_branch_dialog.error_generic'));
      }
    },
  });

  const checkoutMutation = useCheckoutWithUncommittedChangesHandling(org, app, {
    onUncommittedChanges: (error) => {
      setUncommittedChangesError(error);
    },
    onSuccess: resetAndClose,
    onOtherError: () => {
      setError(t('branching.new_branch_dialog.error_generic'));
    },
  });

  const handleCreate = () => {
    const validationResult = BranchNameValidator.validate(branchName);

    if (!validationResult.isValid) {
      setError(t(validationResult.errorKey));
      return;
    }

    setError(null);
    createMutation.mutate(branchName);
  };

  const isCreatingOrCheckingOut = createMutation.isPending || checkoutMutation.isPending;
  const hasError = Boolean(error);
  const cannotCreateBranch = !branchName || isCreatingOrCheckingOut || hasError;
  const createButtonText = isCreatingOrCheckingOut
    ? t('branching.new_branch_dialog.creating')
    : t('branching.new_branch_dialog.create');

  return {
    branchName,
    setBranchName,
    error,
    uncommittedChangesError,
    targetBranch: targetBranchRef.current || branchName,
    isCreatingOrCheckingOut,
    cannotCreateBranch,
    createButtonText,
    handleCreate,
    handleCloseUncommittedChangesDialog,
  };
};
