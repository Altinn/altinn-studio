import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioDialog,
  StudioButton,
  StudioTextfield,
  StudioParagraph,
  StudioHeading,
} from '@studio/components';
import { UncommittedChangesDialog } from '../UncommittedChangesDialog';
import { useCreateBranchFlow } from '../../hooks/useCreateBranchFlow';
import classes from './CreateBranchDialog.module.css';

export interface CreateBranchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  org: string;
  app: string;
}

export const CreateBranchDialog = ({ isOpen, onClose, org, app }: CreateBranchDialogProps) => {
  const { t } = useTranslation();

  const {
    branchName,
    setBranchName,
    error,
    uncommittedChangesError,
    targetBranch,
    isCreatingOrCheckingOut,
    cannotCreateBranch,
    createButtonText,
    handleCreate,
    handleCloseUncommittedChangesDialog,
  } = useCreateBranchFlow({ org, app, onSuccess: onClose });

  return (
    <>
      <StudioDialog
        open={isOpen && !uncommittedChangesError}
        onClose={onClose}
        data-color-scheme='light'
      >
        <StudioDialog.Block>
          <StudioHeading>{t('branching.new_branch_dialog.create')}</StudioHeading>
        </StudioDialog.Block>
        <StudioDialog.Block className={classes.dialogMainContent}>
          <StudioParagraph>{t('branching.new_branch_dialog.description')}</StudioParagraph>
          <StudioTextfield
            label={t('branching.new_branch_dialog.branch_name_label')}
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            placeholder={t('branching.new_branch_dialog.branch_name_placeholder')}
            error={error}
            disabled={isCreatingOrCheckingOut}
          />
          <StudioParagraph>{t('branching.new_branch_dialog.hint')}</StudioParagraph>
          <div className={classes.buttons}>
            <StudioButton variant='secondary' onClick={onClose}>
              {t('general.cancel')}
            </StudioButton>
            <StudioButton onClick={handleCreate}>{createButtonText}</StudioButton>
          </div>
        </StudioDialog.Block>
      </StudioDialog>

      {uncommittedChangesError && (
        <UncommittedChangesDialog
          error={uncommittedChangesError}
          targetBranch={targetBranch}
          onClose={handleCloseUncommittedChangesDialog}
          org={org}
          app={app}
        />
      )}
    </>
  );
};
