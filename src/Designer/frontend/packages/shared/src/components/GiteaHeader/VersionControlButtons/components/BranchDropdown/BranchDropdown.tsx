import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioDropdown, StudioSpinner } from '@studio/components';
import { BranchingIcon, PlusIcon } from '@studio/icons';
import { useBranchesQuery } from 'app-shared/hooks/queries/useBranchesQuery';
import { useCurrentBranchQuery } from 'app-shared/hooks/queries/useCurrentBranchQuery';
import { UncommittedChangesDialog } from 'app-shared/components/UncommittedChangesDialog';
import { CreateBranchDialog } from 'app-shared/components/CreateBranchDialog';
import type { UncommittedChangesError } from 'app-shared/types/api/BranchTypes';
import { useGiteaHeaderContext } from '../../../context/GiteaHeaderContext';
import classes from './BranchDropdown.module.css';
import { useCreateAndCheckoutBranch } from '../../hooks/useCreateNewBranch/useCreateAndCheckoutBranch';
import { useCheckoutBranchAndReload } from '../../hooks/useCheckoutBranchAndReload';
import { useDiscardChangesMutation } from 'app-shared/hooks/mutations/useDiscardChangesMutation';

export const BranchDropdown = () => {
  const { t } = useTranslation();
  const { owner: org, repoName: app } = useGiteaHeaderContext();

  // Call all API hooks in component to display the loading spinner
  const { data: currentBranchInfo, isLoading: isLoadingCurrentBranch } = useCurrentBranchQuery(
    org,
    app,
  );
  const { data: allBranches, isLoading: isLoadingAllBranches } = useBranchesQuery(org, app);
  const {
    createAndCheckoutBranch,
    isLoading: isLoadingCreateNewBranch,
    uncommittedChangesError: uncommittedChangesErrorCreate,
    createError,
  } = useCreateAndCheckoutBranch(org, app);
  const discardChangesMutation = useDiscardChangesMutation(org, app);
  const {
    checkoutBranchAndReload,
    isLoading: isLoadingBranchCheckout,
    uncommittedChangesErrorCheckout,
  } = useCheckoutBranchAndReload(org, app);
  const uncommittedChangesError = getFirstUncommittedChangesError([
    uncommittedChangesErrorCreate,
    uncommittedChangesErrorCheckout,
  ]);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUncommittedChangesDialog, setShowUncommittedChangesDialog] =
    useState(!!uncommittedChangesError);

  const handleDiscardAndSwitch = (targetBranch: string) => {
    if (!window.confirm(t('branching.uncommitted_changes_dialog.confirm_discard'))) {
      return;
    }

    discardChangesMutation.mutate();
    checkoutBranchAndReload(targetBranch);
  };

  const onClickBranch = (targetBranch: string) => {
    checkoutBranchAndReload(targetBranch);
  };

  const currentBranch = currentBranchInfo.branchName;
  const isLoading =
    isLoadingBranchCheckout ||
    isLoadingCurrentBranch ||
    isLoadingAllBranches ||
    isLoadingCreateNewBranch ||
    discardChangesMutation.isPending;

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
        onCreateBranch={createAndCheckoutBranch}
        isLoading={isLoading}
        createError={createError}
      />
    </>
  );
};

function getFirstUncommittedChangesError(
  array: UncommittedChangesError[],
): UncommittedChangesError | undefined {
  return array.find((element) => element !== null);
}
