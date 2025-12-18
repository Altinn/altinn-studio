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
import { useGiteaHeaderContext } from '../../../context/GiteaHeaderContext';
import classes from './BranchDropdown.module.css';

export const BranchDropdown = () => {
  const { t } = useTranslation();
  const { owner: org, repoName: app } = useGiteaHeaderContext();

  const { data: currentBranchInfo, isLoading: isLoadingCurrentBranch } = useCurrentBranchQuery(
    org,
    app,
  );
  const { data: allBranches, isLoading: isLoadingAllBranches } = useBranchesQuery(org, app);

  // Disse tre hookene må sees over/lages/finne riktig eksisterende hook
  // Tanken er at de kan wrappe rundt andre hooks for å gi ut riktige verdier
  const {
    createNewBranch,
    isLoading: isLoadingCreateNewBranch,
    uncommittedChangesErrorCreate,
  } = useCreateNewBranch();
  const { discardChanges, isLoading: isLoadingDiscardChanges } = useDiscardChangesMutation();
  const {
    checkoutBranchAndReload,
    isLoading: isLoadingBranchCheckout,
    uncommittedChangesErrorCheckout,
  } = useCheckoutBranchAndReload();

  const uncommittedChangesError = getFirstUncommittedChangesError([
    uncommittedChangesErrorCreate,
    uncommittedChangesErrorCheckout,
  ]);

  const [targetBranch, setTargetBranch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUncommittedChangesDialog, setShowUncommittedChangesDialog] =
    useState(!!uncommittedChangesError);

  const handleDiscardAndSwitch = () => {
    if (!window.confirm(t('branching.uncommitted_changes_dialog.confirm_discard'))) {
      return;
    }

    discardChanges();
    checkoutBranchAndReload();
  };

  const onClickBranch = (branch: string) => {
    setTargetBranch(branch);
    checkoutBranchAndReload();
  };

  const currentBranch = currentBranchInfo.branchName;
  const isLoading =
    isLoadingBranchCheckout ||
    isLoadingCurrentBranch ||
    isLoadingAllBranches ||
    isLoadingCreateNewBranch ||
    isLoadingDiscardChanges;

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
          {allBranches?.map((branch) => (
            <StudioDropdown.Item key={branch.name}>
              <StudioDropdown.Button
                onClick={() => onClickBranch(branch.name)}
                disabled={branch.name === currentBranch || isLoading}
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
      <UncommittedChangesDialog
        isOpen={showUncommittedChangesDialog}
        onClose={() => setShowUncommittedChangesDialog(false)}
        onDiscardAndSwitch={handleDiscardAndSwitch}
        error={uncommittedChangesError}
        isLoading={isLoading}
      />
      <CreateBranchDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        currentBranch={currentBranch}
        onCreateBranch={createNewBranch}
        isLoading={isLoading}
        newBranchName={targetBranch}
        setNewBranchName={setTargetBranch}
      />
    </>
  );
};

function getFirstUncommittedChangesError(
  array: UncommittedChangesError[],
): UncommittedChangesError | undefined {
  return array.find((element) => element !== null);
}
