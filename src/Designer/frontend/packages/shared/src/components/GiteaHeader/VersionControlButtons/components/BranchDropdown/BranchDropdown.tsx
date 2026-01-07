import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioDropdown, StudioSpinner } from '@studio/components';
import { BranchingIcon } from '@studio/icons';
import { UncommittedChangesDialog } from 'app-shared/components/UncommittedChangesDialog';
import { CreateBranchDialog } from 'app-shared/components/CreateBranchDialog';
import { useGiteaHeaderContext } from '../../../context/GiteaHeaderContext';
import classes from './BranchDropdown.module.css';
import { useBranchData } from './hooks/useBranchData';
import { useBranchOperations } from './hooks/useBranchOperations';
import { BranchListItems } from './components/BranchListItems';

export const BranchDropdown = () => {
  const { t } = useTranslation();
  const { owner: org, repoName: app } = useGiteaHeaderContext();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { currentBranch, branchList, isLoading: isLoadingData } = useBranchData(org, app);
  const {
    checkoutExistingBranch,
    checkoutNewBranch,
    discardChangesAndCheckout,
    clearUncommittedChangesError,
    uncommittedChangesError,
    createError,
    isLoading: isLoadingOperations,
  } = useBranchOperations(org, app);

  const isLoading = isLoadingData || isLoadingOperations;

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
          <BranchListItems
            branchList={branchList}
            currentBranch={currentBranch}
            onBranchClick={checkoutExistingBranch}
            onCreateBranchClick={() => setShowCreateDialog(true)}
          />
        </StudioDropdown.List>
      </StudioDropdown>
      <CreateBranchDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        currentBranch={currentBranch}
        onCreateBranch={checkoutNewBranch}
        isLoading={isLoading}
        createError={createError}
      />
      {uncommittedChangesError && (
        <UncommittedChangesDialog
          onClose={clearUncommittedChangesError}
          onDiscardAndSwitch={discardChangesAndCheckout}
          error={uncommittedChangesError}
          isLoading={isLoading}
        />
      )}
    </>
  );
};
