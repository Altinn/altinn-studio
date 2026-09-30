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
  const branchNames = branchList?.map((branch) => branch.name) ?? [];
  const shouldDisplayBranchList = branchNames.length > 1;

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
            branchNames={branchNames}
            currentBranch={currentBranch}
            onBranchClick={checkoutExistingBranch}
          />
        )}
      </StudioDropdown>
      <CreateBranchDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        currentBranch={currentBranch}
        existingBranchNames={branchNames}
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
    <>
      <StudioDropdown.Heading>{t('branching.actions_heading')}</StudioDropdown.Heading>
      <StudioDropdown.List>
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
    </>
  );
};

interface BranchListProps {
  branchNames: string[];
  currentBranch: string | undefined;
  onBranchClick: (branchName: string) => void;
}

const BranchList = ({ branchNames, currentBranch, onBranchClick }: BranchListProps) => {
  const { t } = useTranslation();

  return (
    <>
      <StudioDropdown.Heading>{t('branching.select_branch_heading')}</StudioDropdown.Heading>
      <StudioDropdown.List className={classes.branchList}>
        {branchNames.map((branchName) => (
          <StudioDropdown.Item key={branchName}>
            <StudioDropdown.Button
              onClick={() => onBranchClick(branchName)}
              disabled={branchName === currentBranch}
              title={t('branching.switch_to_branch', { branchName })}
            >
              <BranchingIcon />
              {branchName}
            </StudioDropdown.Button>
          </StudioDropdown.Item>
        ))}
      </StudioDropdown.List>
    </>
  );
};
