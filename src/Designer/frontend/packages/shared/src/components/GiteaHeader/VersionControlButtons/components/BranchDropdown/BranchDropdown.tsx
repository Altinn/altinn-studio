import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioDropdown, StudioSpinner } from '@studio/components';
import { BranchingIcon, PlusIcon } from '@studio/icons';
import { useBranchesQuery } from 'app-shared/hooks/queries/useBranchesQuery';
import { useCurrentBranchQuery } from 'app-shared/hooks/queries/useCurrentBranchQuery';
import { useCheckoutWithUncommittedChangesHandling } from 'app-shared/hooks/mutations/useCheckoutWithUncommittedChangesHandling';
import { UncommittedChangesDialog } from 'app-shared/components/UncommittedChangesDialog';
import { CreateBranchDialog } from 'app-shared/components/CreateBranchDialog';
import { useCreateBranchFlow } from 'app-shared/hooks/useCreateBranchFlow';
import type { UncommittedChangesError } from 'app-shared/types/api/BranchTypes';
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

  const handleUncommittedChanges = (error: UncommittedChangesError) => {
    setUncommittedChangesError(error);
    setShowCreateDialog(false);
  };

  const checkoutMutation = useCheckoutWithUncommittedChangesHandling(org, app, {
    onUncommittedChanges: setUncommittedChangesError,
    onSuccess: async () => location.reload(),
  });

  const {
    newBranchName,
    setNewBranchName,
    error: createBranchError,
    isCreatingOrCheckingOut,
    handleCreate,
  } = useCreateBranchFlow({
    org,
    app,
    onSuccess: () => setShowCreateDialog(false),
    onUncommittedChanges: handleUncommittedChanges,
  });

  const handleBranchSelect = (branchName: string) => {
    if (!branchName || branchName === currentBranchInfo?.branchName) return;
    checkoutMutation.mutate(branchName);
  };

  const handleCloseUncommittedChangesDialog = () => {
    setUncommittedChangesError(null);
    setNewBranchName('');
  };

  const handleCloseCreateBranchDialog = () => {
    setNewBranchName('');
    setShowCreateDialog(false);
  };

  const isLoading = branchesLoading || checkoutMutation.isPending || isCreatingOrCheckingOut;

  if (isLoading) {
    return (
      <div className={classes.loading}>
        <StudioSpinner aria-label={t('general.loading')} />
      </div>
    );
  }

  const currentBranch = currentBranchInfo?.branchName || 'master';

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
          targetBranch={uncommittedChangesError.targetBranch}
          onClose={handleCloseUncommittedChangesDialog}
          org={org}
          app={app}
        />
      )}

      <CreateBranchDialog
        isOpen={showCreateDialog}
        onClose={handleCloseCreateBranchDialog}
        currentBranch={currentBranch}
        newBranchName={newBranchName}
        setNewBranchName={setNewBranchName}
        error={createBranchError}
        isCreatingOrCheckingOut={isCreatingOrCheckingOut}
        handleCreate={handleCreate}
      />
    </>
  );
};
