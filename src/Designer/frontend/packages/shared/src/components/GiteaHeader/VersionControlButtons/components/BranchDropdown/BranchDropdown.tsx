import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '@studio/hooks';
import { StudioDropdown, StudioSpinner } from '@studio/components';
import { BranchingIcon, PlusIcon } from '@studio/icons';
import { UncommittedChangesDialog } from 'app-shared/components/UncommittedChangesDialog';
import { CreateBranchDialog } from 'app-shared/components/CreateBranchDialog';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { useGiteaHeaderContext } from '../../../context/GiteaHeaderContext';
import classes from './BranchDropdown.module.css';
import { useBranchData } from '../../hooks/useBranchData';
import { useBranchOperations } from '../../hooks/useBranchOperations';
import type { Branch } from 'app-shared/types/api/BranchTypes';

export const BranchDropdown = () => {
  const { t } = useTranslation();
  const { owner: org, repoName: app } = useGiteaHeaderContext();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);

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

  const triggerButtonText = shouldDisplayText ? currentBranch : undefined;
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
        triggerButtonText={triggerButtonText}
        triggerButtonVariant='tertiary'
        triggerButtonTitle={t('branching.select_branch')}
        triggerButtonAriaLabel={t('branching.select_branch')}
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

interface BranchListItemsProps {
  branchList: Array<Branch> | undefined;
  currentBranch: string | undefined;
  onBranchClick: (branchName: string) => void;
  onCreateBranchClick: () => void;
}

const BranchListItems = ({
  branchList,
  currentBranch,
  onBranchClick,
  onCreateBranchClick,
}: BranchListItemsProps) => {
  const { t } = useTranslation();

  return (
    <>
      {branchList?.map((branch) => (
        <StudioDropdown.Item key={branch.name}>
          <StudioDropdown.Button
            onClick={() => onBranchClick(branch.name)}
            disabled={branch.name === currentBranch}
          >
            {branch.name}
          </StudioDropdown.Button>
        </StudioDropdown.Item>
      ))}
      <StudioDropdown.Item>
        <StudioDropdown.Button onClick={onCreateBranchClick}>
          <PlusIcon />
          {t('branching.new_branch_dialog.trigger')}
        </StudioDropdown.Button>
      </StudioDropdown.Item>
    </>
  );
};
