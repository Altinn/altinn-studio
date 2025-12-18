import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AxiosError } from 'axios';
import { StudioDropdown, StudioSpinner } from '@studio/components';
import { BranchingIcon, PlusIcon } from '@studio/icons';
import { useBranchesQuery } from 'app-shared/hooks/queries/useBranchesQuery';
import { useCurrentBranchQuery } from 'app-shared/hooks/queries/useCurrentBranchQuery';
import { useCheckoutWithUncommittedChangesHandling } from 'app-shared/hooks/mutations/useCheckoutWithUncommittedChangesHandling';
import { useCreateBranchMutation } from 'app-shared/hooks/mutations/useCreateBranchMutation';
import { UncommittedChangesDialog } from 'app-shared/components/UncommittedChangesDialog';
import { CreateBranchDialog } from 'app-shared/components/CreateBranchDialog';
import type { UncommittedChangesError } from 'app-shared/types/api/BranchTypes';
import { BranchNameValidator } from 'app-shared/utils/BranchNameValidator';
import { useGiteaHeaderContext } from '../../../context/GiteaHeaderContext';
import classes from './BranchDropdown.module.css';

export const BranchDropdown = () => {
  const { t } = useTranslation();
  const { owner: org, repoName: app } = useGiteaHeaderContext();
  const { data: branches, isLoading: branchesLoading } = useBranchesQuery(org, app);
  const { data: currentBranchInfo } = useCurrentBranchQuery(org, app);

  const [uncommittedChangesError, setUncommittedChangesError] =
    useState<UncommittedChangesError | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [createBranchError, setCreateBranchError] = useState<string | null>(null);

  const handleUncommittedChanges = (error: UncommittedChangesError) => {
    setUncommittedChangesError(error);
    setShowCreateDialog(false);
  };

  const resetCreateBranchState = () => {
    setNewBranchName('');
    setCreateBranchError(null);
    setShowCreateDialog(false);
  };

  const checkoutMutation = useCheckoutWithUncommittedChangesHandling(org, app, {
    onUncommittedChanges: setUncommittedChangesError,
    onSuccess: async () => location.reload(),
  });

  const checkoutForNewBranchMutation = useCheckoutWithUncommittedChangesHandling(org, app, {
    onUncommittedChanges: handleUncommittedChanges,
    onSuccess: resetCreateBranchState,
    onOtherError: () => {
      setCreateBranchError(t('branching.new_branch_dialog.error_generic'));
    },
  });

  const handleCreateBranchError = (err: AxiosError) => {
    const errorKey =
      err.response?.status === 409
        ? 'branching.new_branch_dialog.error_already_exists'
        : 'branching.new_branch_dialog.error_generic';
    setCreateBranchError(t(errorKey));
  };

  const createMutation = useCreateBranchMutation(org, app, {
    onSuccess: () => {
      checkoutForNewBranchMutation.mutate(newBranchName);
    },
    onError: handleCreateBranchError,
  });

  const handleCreate = () => {
    const validationResult = BranchNameValidator.validate(newBranchName);

    if (!validationResult.isValid) {
      setCreateBranchError(t(validationResult.errorKey));
      return;
    }

    setCreateBranchError(null);
    createMutation.mutate(newBranchName);
  };

  const handleBranchSelect = (branchName: string) => {
    if (branchName === currentBranchInfo?.branchName) return;
    checkoutMutation.mutate(branchName);
  };

  const handleCloseUncommittedChangesDialog = () => {
    setUncommittedChangesError(null);
    setNewBranchName('');
  };

  const currentBranch = currentBranchInfo?.branchName || 'master';
  const isLoading =
    branchesLoading ||
    checkoutMutation.isPending ||
    createMutation.isPending ||
    checkoutForNewBranchMutation.isPending;

  if (isLoading) {
    return (
      <div className={classes.loading}>
        <StudioSpinner aria-label={t('general.loading')} />
      </div>
    );
  }

  return (
    <>
      <StudioDropdown
        icon={<BranchingIcon />}
        triggerButtonText={currentBranch}
        triggerButtonVariant='tertiary'
        triggerButtonTitle={t('branching.select_branch')}
        data-color='light'
        data-color-scheme='light'
        triggerButtonClassName={classes.branchButton}
      >
        <StudioDropdown.List>
          {branches?.map((branch) => (
            <StudioDropdown.Item key={branch.name}>
              <StudioDropdown.Button
                onClick={() => handleBranchSelect(branch.name)}
                disabled={branch.name === currentBranch || checkoutMutation.isPending}
              >
                {branch.name}
              </StudioDropdown.Button>
            </StudioDropdown.Item>
          ))}
          <StudioDropdown.Item>
            <StudioDropdown.Button onClick={() => setShowCreateDialog(true)}>
              <PlusIcon />
              {t('branching.new_branch_dialog.trigger')}
            </StudioDropdown.Button>
          </StudioDropdown.Item>
        </StudioDropdown.List>
      </StudioDropdown>

      {uncommittedChangesError && (
        <UncommittedChangesDialog
          error={uncommittedChangesError}
          onClose={handleCloseUncommittedChangesDialog}
          org={org}
          app={app}
        />
      )}

      <CreateBranchDialog
        isOpen={showCreateDialog}
        onClose={resetCreateBranchState}
        currentBranch={currentBranch}
        newBranchName={newBranchName}
        setNewBranchName={setNewBranchName}
        error={createBranchError}
        isCreatingOrCheckingOut={createMutation.isPending || checkoutForNewBranchMutation.isPending}
        handleCreate={handleCreate}
      />
    </>
  );
};
