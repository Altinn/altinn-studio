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
  onCreateBranch: (name: string) => void;
  currentBranch: string;
  createError: string;
  isLoading: boolean;
}

export const CreateBranchDialog = ({
  isOpen,
  onClose,
  onCreateBranch,
  currentBranch,
  createError,
  isLoading,
}: CreateBranchDialogProps) => {
  const { t } = useTranslation();
  const [newBranchName, setNewBranchName] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleClose = () => {
    setNewBranchName('');
    setValidationError('');
    onClose();
  };

  const handleCreateBranch = () => {
    const validationResult = BranchNameValidator.validate(newBranchName);

    if (!validationResult.isValid) {
      setValidationError(t(validationResult.errorKey));
      return;
    }

    setValidationError(null);
    onCreateBranch(newBranchName);
    handleClose();
  };

  const createButtonText = isLoading
    ? t('general.loading')
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
          error={validationError || createError}
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
