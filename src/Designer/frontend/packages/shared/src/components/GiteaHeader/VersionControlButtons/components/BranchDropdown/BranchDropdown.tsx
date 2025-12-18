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
  const [targetBranchForSwitch, setTargetBranchForSwitch] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const checkoutMutation = useCheckoutWithUncommittedChangesHandling(org, app, {
    onUncommittedChanges: (error) => {
      setUncommittedChangesError(error);
    },
    onSuccess: async () => location.reload(),
  });

  const {
    branchName: newBranchName,
    setBranchName,
    error: createBranchError,
    uncommittedChangesError: createUncommittedChangesError,
    targetBranch: createTargetBranch,
    isCreatingOrCheckingOut,
    handleCreate,
    handleCloseUncommittedChangesDialog: handleCloseCreateUncommittedChangesDialog,
  } = useCreateBranchFlow({
    org,
    app,
    onSuccess: () => setShowCreateDialog(false),
  });

  const handleBranchSelect = (branchName: string) => {
    if (!branchName || branchName === currentBranchInfo?.branchName) return;

    setTargetBranchForSwitch(branchName);
    checkoutMutation.mutate(branchName);
  };

  const handleCloseUncommittedChangesDialog = () => {
    setUncommittedChangesError(null);
    setTargetBranchForSwitch(null);
  };

  const handleCloseCreateBranchDialog = () => {
    setBranchName('');
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

      {uncommittedChangesError && targetBranchForSwitch && (
        <UncommittedChangesDialog
          error={uncommittedChangesError}
          targetBranch={targetBranchForSwitch}
          onClose={handleCloseUncommittedChangesDialog}
          org={org}
          app={app}
        />
      )}

      {createUncommittedChangesError && (
        <UncommittedChangesDialog
          error={createUncommittedChangesError}
          targetBranch={createTargetBranch}
          onClose={handleCloseCreateUncommittedChangesDialog}
          org={org}
          app={app}
        />
      )}

      <CreateBranchDialog
        isOpen={showCreateDialog}
        onClose={handleCloseCreateBranchDialog}
        currentBranch={currentBranch}
        branchName={newBranchName}
        setBranchName={setBranchName}
        error={createBranchError}
        isCreatingOrCheckingOut={isCreatingOrCheckingOut}
        handleCreate={handleCreate}
      />
    </>
  );
};
