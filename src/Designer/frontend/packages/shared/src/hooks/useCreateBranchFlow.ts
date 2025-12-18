import { useState } from 'react';
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
  onUncommittedChanges?: (error: UncommittedChangesError) => void;
}

interface UseCreateBranchFlowResult {
  newBranchName: string;
  setNewBranchName: (name: string) => void;
  error: string | null;
  isCreatingOrCheckingOut: boolean;
  handleCreate: () => void;
}

export const useCreateBranchFlow = ({
  org,
  app,
  onSuccess,
  onUncommittedChanges,
}: UseCreateBranchFlowOptions): UseCreateBranchFlowResult => {
  const { t } = useTranslation();

  const [newBranchName, setNewBranchName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const resetAndClose = () => {
    setNewBranchName('');
    setError(null);
    onSuccess();
  };

  const createMutation = useCreateBranchMutation(org, app, {
    onSuccess: () => {
      checkoutMutation.mutate(newBranchName);
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
    onUncommittedChanges,
    onSuccess: resetAndClose,
    onOtherError: () => {
      setError(t('branching.new_branch_dialog.error_generic'));
    },
  });

  const handleCreate = () => {
    const validationResult = BranchNameValidator.validate(newBranchName);

    if (!validationResult.isValid) {
      setError(t(validationResult.errorKey));
      return;
    }

    setError(null);
    createMutation.mutate(newBranchName);
  };

  const isCreatingOrCheckingOut = createMutation.isPending || checkoutMutation.isPending;

  return {
    newBranchName,
    setNewBranchName,
    error,
    isCreatingOrCheckingOut,
    handleCreate,
  };
};
