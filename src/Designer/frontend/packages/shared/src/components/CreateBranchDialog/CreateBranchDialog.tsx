import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  StudioDialog,
  StudioButton,
  StudioTextfield,
  StudioParagraph,
  StudioHeading,
} from '@studio/components';
import classes from './CreateBranchDialog.module.css';
import { BranchNameValidator } from 'app-shared/utils/BranchNameValidator';

export interface CreateBranchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentBranch: string;
  onCreateBranch: (name: string) => void;
  createError: string;
  isLoading: boolean;
}

export const CreateBranchDialog = ({
  isOpen,
  onClose,
  currentBranch,
  onCreateBranch,
  createError,
  isLoading,
}: CreateBranchDialogProps) => {
  const { t } = useTranslation();
  const [newBranchName, setNewBranchName] = useState('');
  const [error, setError] = useState<string | null>(createError);

  const handleClose = () => {
    setNewBranchName('');
    setError('');
    onClose();
  };

  const handleCreateBranch = () => {
    const validationResult = BranchNameValidator.validate(newBranchName);

    if (!validationResult.isValid) {
      setError(t(validationResult.errorKey));
      return;
    }

    setError(null);
    onCreateBranch(newBranchName);
  };

  const createButtonText = isLoading
    ? t('branching.new_branch_dialog.creating')
    : t('branching.new_branch_dialog.create');

  return (
    <StudioDialog open={isOpen} onClose={handleClose} data-color-scheme='light'>
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
          disabled={isLoading}
        />
        <StudioParagraph>{t('branching.new_branch_dialog.hint')}</StudioParagraph>
        <div className={classes.buttons}>
          <StudioButton onClick={handleCreateBranch} disabled={isLoading}>
            {createButtonText}
          </StudioButton>
          <StudioButton variant='secondary' onClick={handleClose}>
            {t('general.cancel')}
          </StudioButton>
        </div>
      </StudioDialog.Block>
    </StudioDialog>
  );
};
