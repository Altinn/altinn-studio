import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '@studio/hooks';
import { StudioButton, StudioDropdown, StudioSpinner } from '@studio/components';
import { BranchingIcon, PlusIcon, TrashIcon } from '@studio/icons';
import { UncommittedChangesDialog } from 'app-shared/components/UncommittedChangesDialog';
import { CreateBranchDialog } from 'app-shared/components/CreateBranchDialog';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { useGiteaHeaderContext } from '../../../context/GiteaHeaderContext';
import { DeleteBranchDialog } from '../DeleteBranchDialog';
import classes from './BranchDropdown.module.css';
import { useBranchData } from '../../hooks/useBranchData';
import { useBranchOperations } from '../../hooks/useBranchOperations';
import type { Branch } from 'app-shared/types/api/BranchTypes';

const DEFAULT_BRANCH = 'master';

export const BranchDropdown = () => {
  const { t } = useTranslation();
  const { owner: org, repoName: app } = useGiteaHeaderContext();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<string | null>(null);
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
            onDeleteBranchClick={setBranchToDelete}
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
      {branchToDelete && (
        <DeleteBranchDialog
          branchName={branchToDelete}
          isOpen={!!branchToDelete}
          onClose={() => setBranchToDelete(null)}
        />
      )}
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
  onDeleteBranchClick: (branchName: string) => void;
}

const BranchListItems = ({
  branchList,
  currentBranch,
  onBranchClick,
  onCreateBranchClick,
  onDeleteBranchClick,
}: BranchListItemsProps) => {
  const { t } = useTranslation();

  const isDeletable = (branchName: string): boolean =>
    branchName !== currentBranch && branchName !== DEFAULT_BRANCH;

  return (
    <>
      {branchList?.map((branch) => (
        <StudioDropdown.Item key={branch.name}>
          <div className={classes.branchItem}>
            <StudioDropdown.Button
              onClick={() => onBranchClick(branch.name)}
              disabled={branch.name === currentBranch}
              title={t('branching.switch_to_branch', { branchName: branch.name })}
            >
              {branch.name}
            </StudioDropdown.Button>
            {isDeletable(branch.name) && (
              <StudioButton
                className={classes.deleteButton}
                variant='tertiary'
                icon
                onClick={() => onDeleteBranchClick(branch.name)}
                title={t('branching.delete_branch_button', { branchName: branch.name })}
                aria-label={t('branching.delete_branch_button', { branchName: branch.name })}
              >
                <TrashIcon />
              </StudioButton>
            )}
          </div>
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
