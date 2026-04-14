import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '@studio/hooks';
import { StudioDropdown, StudioSpinner } from '@studio/components';
import { BranchingIcon, PlusIcon, TrashIcon } from '@studio/icons';
import { UncommittedChangesDialog } from './UncommittedChangesDialog';
import { CreateBranchDialog } from './CreateBranchDialog';
import { DEFAULT_APP_BRANCH, MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { useGiteaHeaderContext } from '../../../context/GiteaHeaderContext';
import { DeleteBranchDialog } from './DeleteBranchDialog';
import classes from './BranchDropdown.module.css';
import { useBranchData } from '../../hooks/useBranchData';
import { useBranchOperations } from '../../hooks/useBranchOperations';
import type { Branch } from 'app-shared/types/api/BranchTypes';

export const BranchDropdown = () => {
  const { t } = useTranslation();
  const { owner: org, repoName: app } = useGiteaHeaderContext();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);

  const { currentBranch, branchList, isLoading: isLoadingData } = useBranchData(org, app);
  const {
    checkoutExistingBranch,
    checkoutNewBranch,
    discardChangesAndCheckout,
    deleteCurrentBranch,
    clearUncommittedChangesError,
    uncommittedChangesError,
    createError,
    isLoading: isLoadingOperations,
  } = useBranchOperations(org, app);

  const triggerButtonText = shouldDisplayText ? currentBranch : undefined;
  const isLoading = isLoadingData || isLoadingOperations;
  const canDeleteCurrentBranch = currentBranch !== DEFAULT_APP_BRANCH;
  const shouldDisplayBranchList = branchList?.length > 1;

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
        <BranchActions
          canDeleteCurrentBranch={canDeleteCurrentBranch}
          onCreateBranchClick={() => setShowCreateDialog(true)}
          onDeleteBranchClick={() => setShowDeleteDialog(true)}
        />
        {shouldDisplayBranchList && (
          <BranchList
            branchList={branchList}
            currentBranch={currentBranch}
            onBranchClick={checkoutExistingBranch}
          />
        )}
      </StudioDropdown>
      <CreateBranchDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        currentBranch={currentBranch}
        onCreateBranch={checkoutNewBranch}
        isLoading={isLoading}
        createError={createError}
      />
      <DeleteBranchDialog
        branchName={currentBranch}
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onDelete={deleteCurrentBranch}
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

interface BranchActionsProps {
  canDeleteCurrentBranch: boolean;
  onCreateBranchClick: () => void;
  onDeleteBranchClick: () => void;
}

const BranchActions = ({
  canDeleteCurrentBranch,
  onCreateBranchClick,
  onDeleteBranchClick,
}: BranchActionsProps) => {
  const { t } = useTranslation();

  return (
    <StudioDropdown.List>
      <StudioDropdown.Heading>{t('branching.actions_heading')}</StudioDropdown.Heading>
      <StudioDropdown.Item>
        <StudioDropdown.Button onClick={onCreateBranchClick}>
          <PlusIcon />
          {t('branching.new_branch_dialog.trigger')}
        </StudioDropdown.Button>
      </StudioDropdown.Item>
      {canDeleteCurrentBranch && (
        <StudioDropdown.Item>
          <StudioDropdown.Button onClick={onDeleteBranchClick} data-color='danger'>
            <TrashIcon />
            {t('branching.delete_branch_dialog.title')}
          </StudioDropdown.Button>
        </StudioDropdown.Item>
      )}
    </StudioDropdown.List>
  );
};

interface BranchListProps {
  branchList: Array<Branch> | undefined;
  currentBranch: string | undefined;
  onBranchClick: (branchName: string) => void;
}

const BranchList = ({ branchList, currentBranch, onBranchClick }: BranchListProps) => {
  const { t } = useTranslation();

  return (
    <StudioDropdown.List>
      <StudioDropdown.Heading>{t('branching.select_branch_heading')}</StudioDropdown.Heading>
      <div className={classes.branchList}>
        {branchList?.map((branch) => (
          <StudioDropdown.Item key={branch.name}>
            <StudioDropdown.Button
              onClick={() => onBranchClick(branch.name)}
              disabled={branch.name === currentBranch}
              title={t('branching.switch_to_branch', { branchName: branch.name })}
            >
              <BranchingIcon />
              {branch.name}
            </StudioDropdown.Button>
          </StudioDropdown.Item>
        ))}
      </div>
    </StudioDropdown.List>
  );
};
