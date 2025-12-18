import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  StudioDialog,
  StudioButton,
  StudioTextfield,
  StudioParagraph,
  StudioHeading,
} from '@studio/components';
import classes from './CreateBranchDialog.module.css';

export interface CreateBranchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentBranch: string;
  newBranchName: string;
  setNewBranchName: (name: string) => void;
  error: string | null;
  isCreatingOrCheckingOut: boolean;
  handleCreate: () => void;
}

export const CreateBranchDialog = ({
  isOpen,
  onClose,
  currentBranch,
  newBranchName,
  setNewBranchName,
  error,
  isCreatingOrCheckingOut,
  handleCreate,
}: CreateBranchDialogProps) => {
  const { t } = useTranslation();

  const createButtonText = isCreatingOrCheckingOut
    ? t('branching.new_branch_dialog.creating')
    : t('branching.new_branch_dialog.create');

  return (
    <StudioDialog open={isOpen} onClose={onClose} data-color-scheme='light'>
      <StudioDialog.Block>
        <StudioHeading>{t('branching.new_branch_dialog.create')}</StudioHeading>
      </StudioDialog.Block>
      <StudioDialog.Block className={classes.dialogMainContent}>
        <StudioParagraph>
          <Trans
            i18nKey='branching.new_branch_dialog.description'
            values={{ currentBranch }}
            components={{ strong: <strong /> }}
            shouldUnescape
          />
        </StudioParagraph>
        <StudioTextfield
          label={t('branching.new_branch_dialog.branch_name_label')}
          value={newBranchName}
          onChange={(e) => setNewBranchName(e.target.value)}
          placeholder={t('branching.new_branch_dialog.branch_name_placeholder')}
          error={error}
          disabled={isCreatingOrCheckingOut}
        />
        <StudioParagraph>{t('branching.new_branch_dialog.hint')}</StudioParagraph>
        <div className={classes.buttons}>
          <StudioButton onClick={handleCreate} disabled={isCreatingOrCheckingOut}>
            {createButtonText}
          </StudioButton>
          <StudioButton variant='secondary' onClick={onClose}>
            {t('general.cancel')}
          </StudioButton>
        </div>
      </StudioDialog.Block>
    </StudioDialog>
  );
};
