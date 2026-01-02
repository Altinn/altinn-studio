import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioDropdown, StudioSpinner } from '@studio/components';
import { BranchingIcon, PlusIcon } from '@studio/icons';
import { useBranchesQuery } from 'app-shared/hooks/queries/useBranchesQuery';
import { useCurrentBranchQuery } from 'app-shared/hooks/queries/useCurrentBranchQuery';
import { UncommittedChangesDialog } from 'app-shared/components/UncommittedChangesDialog';
import { CreateBranchDialog } from 'app-shared/components/CreateBranchDialog';
import { useGiteaHeaderContext } from '../../../context/GiteaHeaderContext';
import classes from './BranchDropdown.module.css';
import { useCreateAndCheckoutBranch } from '../../hooks/useCreateNewBranch/useCreateAndCheckoutBranch';
import { useCheckoutBranchAndReload } from '../../hooks/useCheckoutBranchAndReload';
import { useDiscardChangesMutation } from 'app-shared/hooks/mutations/useDiscardChangesMutation';
import { useUncommittedChangesDialog } from '../../hooks/useUncommittedChangesDialog';

export const BranchDropdown = () => {
  const { t } = useTranslation();
  const { owner: org, repoName: app } = useGiteaHeaderContext();
  const { data: currentBranchInfo, isLoading: isLoadingCurrentBranch } = useCurrentBranchQuery(
    org,
    app,
  );
  const { data: branchList, isLoading: isLoadingBranchList } = useBranchesQuery(org, app);
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
    uncommittedChangesError: uncommittedChangesErrorCheckout,
  } = useCheckoutBranchAndReload(org, app);
  const { showUncommittedChangesDialog, setShowUncommittedChangesDialog, uncommittedChangesError } =
    useUncommittedChangesDialog([uncommittedChangesErrorCreate, uncommittedChangesErrorCheckout]);

  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleDiscardAndSwitch = (targetBranch: string) => {
    discardChangesMutation.mutate(undefined, {
      onSuccess: () => checkoutBranchAndReload(targetBranch),
    });
  };

  const currentBranch = currentBranchInfo?.branchName;
  const isLoading =
    isLoadingBranchCheckout ||
    isLoadingCurrentBranch ||
    isLoadingBranchList ||
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
          {branchList?.map((branch) => (
            <StudioDropdown.Item key={branch.name}>
              <StudioDropdown.Button
                onClick={() => checkoutBranchAndReload(branch.name)}
                disabled={branch.name === currentBranch}
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
      <CreateBranchDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        currentBranch={currentBranch}
        onCreateBranch={createAndCheckoutBranch}
        isLoading={isLoading}
        createError={createError}
      />
      {uncommittedChangesError && (
        <UncommittedChangesDialog
          isOpen={showUncommittedChangesDialog}
          onClose={() => setShowUncommittedChangesDialog(false)}
          onDiscardAndSwitch={handleDiscardAndSwitch}
          error={uncommittedChangesError}
          isLoading={isLoading}
        />
      )}
    </>
  );
};
